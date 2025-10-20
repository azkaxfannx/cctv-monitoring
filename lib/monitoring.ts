import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import { smartStatusLogging, createStatusLog } from "./smart-logging";
import DigestFetch from "digest-fetch";
import { whatsappAlert } from "./whatsapp-helper";

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export async function pingCamera(ip: string): Promise<boolean> {
  try {
    const command =
      process.platform === "win32"
        ? `ping -n 1 -w 2000 ${ip}`
        : `ping -c 1 -W 2000 ${ip}`;

    const { stdout, stderr } = await execAsync(command, { timeout: 5000 });

    const isAlive =
      !stderr &&
      (stdout.includes("bytes=") || stdout.includes("1 packets received"));
    console.log(`[PING] ${ip} -> ${isAlive ? "ALIVE" : "DEAD"}`);

    return isAlive;
  } catch (error) {
    console.error(`[PING ERROR] ${ip}:`, error);
    return false;
  }
}

export async function scrapeCameraDate(
  ip: string,
  username?: string,
  password?: string
): Promise<string | null> {
  console.log(`\n[SCRAPE DEBUG START] ${ip}`);
  console.log(`[SCRAPE DEBUG] Username: ${username || "NOT PROVIDED"}`);
  console.log(
    `[SCRAPE DEBUG] Password: ${password ? "***PROVIDED***" : "NOT PROVIDED"}`
  );

  try {
    // Endpoint khusus untuk Hikvision dan Samsung
    const endpoints = [
      // Hikvision endpoints
      "/ISAPI/System/deviceInfo", // Device info API
      "/ISAPI/System/time", // System time API
      "/ISAPI/Security/userCheck", // Test authentication
      "/doc/page/config.asp", // Web config page
      "/doc/page/preview.asp", // Web preview page

      // Samsung endpoints
      "/stw-cgi/system.cgi?action=get", // Samsung system info
      "/config/system.cgi", // Samsung config
      "/cgi-bin/systeminfo", // Samsung system info

      // Common endpoints
      "/system",
      "/config",
      "/",
    ];

    let finalDate = null;

    for (const endpoint of endpoints) {
      console.log(`[SCRAPE DEBUG] Trying endpoint: ${endpoint}`);

      const baseUrl = `http://${ip}`;

      // Config untuk request
      const config: any = {
        timeout: 10000,
        validateStatus: function (status: number) {
          return status >= 200 && status < 600;
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.5",
        },
        // Tambahkan ini untuk handle redirect dan auth
        maxRedirects: 0, // Jangan ikuti redirect
      };

      // Tambahkan authentication jika username & password ada
      if (username && password) {
        console.log(`[SCRAPE DEBUG] Using authentication for ${endpoint}`);

        // Coba Basic Auth dulu
        config.auth = {
          username: username,
          password: password,
        };
      }

      try {
        console.log(
          `[SCRAPE DEBUG] Making request to ${baseUrl}${endpoint}...`
        );
        let response = await axios.get(`${baseUrl}${endpoint}`, config);

        console.log(`[SCRAPE DEBUG] ${endpoint} -> Status: ${response.status}`);

        // Handle 401 - Coba dengan Digest Auth
        if (response.status === 401 && username && password) {
          console.log(`[SCRAPE DEBUG] 401 received, trying Digest Auth...`);

          // Coba dengan digest auth menggunakan library khusus
          response = await tryDigestAuth(
            `${baseUrl}${endpoint}`,
            username,
            password
          );
          console.log(
            `[SCRAPE DEBUG] Digest Auth -> Status: ${response.status}`
          );
        }

        if (response.status === 200) {
          console.log(`[SCRAPE DEBUG] SUCCESS: ${endpoint} returned 200`);

          const responseData = response.data;
          const contentType = response.headers["content-type"] || "";

          console.log(`[SCRAPE DEBUG] Content-Type: ${contentType}`);
          console.log(`[SCRAPE DEBUG] Response type: ${typeof responseData}`);

          // Handle berdasarkan endpoint dan content type
          let extractedDate = null;

          if (endpoint.includes("/ISAPI/")) {
            // Hikvision XML API
            extractedDate = extractDateFromHikvisionXML(responseData);
          } else if (endpoint.includes(".cgi")) {
            // Samsung CGI API
            extractedDate = extractDateFromSamsungCGI(responseData);
          } else if (contentType.includes("text/html")) {
            // HTML pages
            extractedDate = extractDateFromHTML(responseData);
          } else {
            // Try generic extraction
            extractedDate = extractDateGeneric(responseData);
          }

          if (extractedDate) {
            console.log(
              `[SCRAPE DEBUG] ✅ DATE FOUND in ${endpoint}: ${extractedDate}`
            );
            finalDate = extractedDate;
            break;
          } else {
            console.log(`[SCRAPE DEBUG] ❌ No date found in ${endpoint}`);

            // Debug content untuk analisis
            if (typeof responseData === "string") {
              console.log(
                `[SCRAPE DEBUG] First 500 chars: ${responseData.substring(
                  0,
                  500
                )}`
              );

              // Untuk HTML, cari lebih dalam
              if (endpoint.includes("/ISAPI/")) {
                console.log(
                  `[SCRAPE DEBUG] ISAPI Full response (first 1000 chars):`,
                  responseData.substring(0, 1000)
                );
              }
            }
          }
        } else if (response.status === 401) {
          console.log(
            `[SCRAPE DEBUG] ❌ Authentication failed for ${endpoint}`
          );
        } else if (response.status === 404) {
          console.log(`[SCRAPE DEBUG] ❌ Endpoint not found: ${endpoint}`);
        } else if (response.status === 403) {
          console.log(`[SCRAPE DEBUG] ❌ Access forbidden: ${endpoint}`);
        } else if (response.status === 400) {
          console.log(`[SCRAPE DEBUG] ❌ Bad request: ${endpoint}`);
        }
      } catch (endpointError: any) {
        console.log(
          `[SCRAPE DEBUG] Error with ${endpoint}: ${endpointError.message}`
        );
      }
    }

    console.log(`[SCRAPE] ${ip} -> Final Date: ${finalDate || "NOT FOUND"}`);
    return finalDate;
  } catch (error: any) {
    console.log(`[SCRAPE DEBUG] Overall error:`, error.message);
    return null;
  } finally {
    console.log(`[SCRAPE DEBUG END] ${ip}\n`);
  }
}

async function tryHikvisionISAPI(
  ip: string,
  username: string,
  password: string
) {
  try {
    console.log(`[HIKVISION ISAPI] Trying with digest-fetch...`);

    const client = new DigestFetch(username, password);

    const endpoints = [
      "/ISAPI/System/deviceInfo",
      "/ISAPI/System/time",
      "/ISAPI/System/status",
    ];

    for (const endpoint of endpoints) {
      try {
        const url = `http://${ip}${endpoint}`;
        console.log(`[HIKVISION ISAPI] Trying: ${url}`);

        const response = await client.fetch(url);
        const text = await response.text();

        console.log(
          `[HIKVISION ISAPI] ${endpoint} -> Status: ${response.status}`
        );

        if (response.status === 200) {
          console.log(`[HIKVISION ISAPI] SUCCESS with ${endpoint}`);

          // Extract date dari XML response
          const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            console.log(`[HIKVISION ISAPI] Date found: ${dateMatch[1]}`);
            return dateMatch[1];
          }

          // Log XML content untuk debugging
          console.log(
            `[HIKVISION ISAPI] XML response (first 500 chars):`,
            text.substring(0, 500)
          );
        }
      } catch (error) {
        console.log(
          `[HIKVISION ISAPI] Error with ${endpoint}:`,
          (error as any).message
        );
      }
    }

    return null;
  } catch (error) {
    console.log(`[HIKVISION ISAPI] Overall error:`, error);
    return null;
  }
}

// Function untuk Digest Authentication
async function tryDigestAuth(url: string, username: string, password: string) {
  try {
    // Gunakan library http-digest-client atau approach manual
    const { default: digestAuth } = await import("http-digest-client");

    const client = digestAuth(username, password);
    return await client.get(url);
  } catch (error) {
    console.log(`[DIGEST AUTH] Error:`, error);

    // Fallback: coba dengan approach manual
    return await manualDigestAuth(url, username, password);
  }
}

// Manual Digest Auth implementation
async function manualDigestAuth(
  url: string,
  username: string,
  password: string
) {
  try {
    // Step 1: Get authentication challenge
    const challengeResponse = await axios.get(url, {
      validateStatus: () => true,
    });

    if (challengeResponse.status !== 401) {
      return challengeResponse;
    }

    const authHeader = challengeResponse.headers["www-authenticate"];
    console.log(`[DIGEST AUTH] Challenge: ${authHeader}`);

    // Parse digest challenge (sederhana)
    // Untuk implementasi lengkap, butuh library seperti 'digest-fetch'

    // Fallback ke approach lain
    return await tryAlternativeAuthMethods(url, username, password);
  } catch (error) {
    console.log(`[MANUAL DIGEST AUTH] Error:`, error);
    throw error;
  }
}

// Alternative auth methods
async function tryAlternativeAuthMethods(
  url: string,
  username: string,
  password: string
) {
  console.log(`[ALTERNATIVE AUTH] Trying alternative methods...`);

  // Method 1: Coba dengan query parameters (beberapa kamera support)
  try {
    const urlWithAuth = url.includes("?")
      ? `${url}&user=${username}&password=${password}`
      : `${url}?user=${username}&password=${password}`;

    const response = await axios.get(urlWithAuth);
    console.log(`[ALTERNATIVE AUTH] Query params method: ${response.status}`);
    return response;
  } catch (error) {
    console.log(`[ALTERNATIVE AUTH] Query params failed`);
  }

  // Method 2: Coba dengan custom headers
  try {
    const credentials = Buffer.from(`${username}:${password}`).toString(
      "base64"
    );
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    console.log(`[ALTERNATIVE AUTH] Custom headers method: ${response.status}`);
    return response;
  } catch (error) {
    console.log(`[ALTERNATIVE AUTH] Custom headers failed`);
    throw error;
  }
}

// Extract date dari Hikvision XML API
function extractDateFromHikvisionXML(xmlData: string): string | null {
  try {
    console.log(`[HIKVISION XML] Parsing XML data`);

    // Pattern untuk XML date fields
    const datePatterns = [
      /<time>(\d{4}-\d{2}-\d{2})/i,
      /<localTime>(\d{4}-\d{2}-\d{2})/i,
      /<systemTime>(\d{4}-\d{2}-\d{2})/i,
      /<currentTime>(\d{4}-\d{2}-\d{2})/i,
      /time="(\d{4}-\d{2}-\d{2})/i,
    ];

    for (const pattern of datePatterns) {
      const match = xmlData.match(pattern);
      if (match) {
        console.log(`[HIKVISION XML] Found with pattern: ${match[1]}`);
        return match[1];
      }
    }

    // Cari format tanggal lain dalam XML
    const genericDateMatch = xmlData.match(/(\d{4}-\d{2}-\d{2})/);
    if (genericDateMatch) {
      console.log(`[HIKVISION XML] Found generic date: ${genericDateMatch[1]}`);
      return genericDateMatch[1];
    }
  } catch (error) {
    console.log(`[HIKVISION XML] Error parsing XML:`, error);
  }
  return null;
}

// Extract date dari Samsung CGI
function extractDateFromSamsungCGI(cgiData: string): string | null {
  console.log(`[SAMSUNG CGI] Parsing CGI data`);

  // Pattern untuk Samsung CGI response
  const datePatterns = [
    /date=(\d{4}-\d{2}-\d{2})/i,
    /system_date=(\d{4}-\d{2}-\d{2})/i,
    /current_date=(\d{4}-\d{2}-\d{2})/i,
    /"date":"(\d{4}-\d{2}-\d{2})"/i,
  ];

  for (const pattern of datePatterns) {
    const match = cgiData.match(pattern);
    if (match) {
      console.log(`[SAMSUNG CGI] Found with pattern: ${match[1]}`);
      return match[1];
    }
  }

  // Cari format umum
  const genericDateMatch = cgiData.match(/(\d{4}-\d{2}-\d{2})/);
  if (genericDateMatch) {
    console.log(`[SAMSUNG CGI] Found generic date: ${genericDateMatch[1]}`);
    return genericDateMatch[1];
  }

  return null;
}

// Extract date dari HTML (untuk web interface)
function extractDateFromHTML(html: string): string | null {
  console.log(`[HTML] Parsing HTML data`);

  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /value="(\d{4}-\d{2}-\d{2})"/,
    /id=".*date.*".*value="(\d{4}-\d{2}-\d{2})"/i,
    /name=".*date.*".*value="(\d{4}-\d{2}-\d{2})"/i,
  ];

  for (const pattern of datePatterns) {
    const match = html.match(pattern);
    if (match) {
      console.log(`[HTML] Found with pattern: ${match[1]}`);
      return match[1];
    }
  }
  return null;
}

// Extract date generic dari berbagai format
function extractDateGeneric(data: any): string | null {
  const dataString = typeof data === "string" ? data : JSON.stringify(data);

  // Cari pattern tanggal YYYY-MM-DD
  const dateMatch = dataString.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    console.log(`[GENERIC] Found date: ${dateMatch[1]}`);
    return dateMatch[1];
  }

  return null;
}

export async function monitorCamera(camera: any) {
  const today = new Date().toISOString().split("T")[0];

  console.log(
    `\n[${camera.id}] [MONITOR START] Camera: ${camera.name} (${camera.ip})`
  );
  console.log(
    `[${camera.id}] [MONITOR DEBUG] Current status: ${camera.status}`
  );

  try {
    // 1. PING CHECK
    const isOnline = await pingCamera(camera.ip);
    console.log(`[${camera.id}] [MONITOR DEBUG] Ping result: ${isOnline}`);

    let newStatus = "offline";
    let cameraDate = null;

    if (isOnline) {
      newStatus = "online";

      // 2. SCRAPE DATE (hanya jika online)
      const username = camera.username ? String(camera.username) : undefined;
      const password = camera.password ? String(camera.password) : undefined;

      console.log(`[${camera.id}] [MONITOR DEBUG] Starting date scrape...`);

      // Coba method khusus Hikvision terlebih dahulu
      if (username && password) {
        cameraDate = await tryHikvisionISAPI(camera.ip, username, password);
      }

      // Jika method khusus tidak berhasil, coba method umum
      if (!cameraDate) {
        cameraDate = await scrapeCameraDate(camera.ip, username, password);
      }

      if (cameraDate && cameraDate !== today) {
        newStatus = "date_error";
        console.log(
          `[${camera.id}] [DATE ERROR] Expected: ${today}, Got: ${cameraDate}`
        );
      } else if (cameraDate === today) {
        console.log(`[${camera.id}] [DATE OK] ${cameraDate}`);
      } else {
        console.log(
          `[${camera.id}] [DATE DEBUG] No date found or date is null`
        );
      }
    }

    const statusChanged = camera.status !== newStatus;
    console.log(
      `[${camera.id}] [STATUS CHANGE] ${camera.status} -> ${newStatus}, Changed: ${statusChanged}`
    );

    // 3. UPDATE DATABASE
    const updatedCamera = await prisma.camera.update({
      where: { id: camera.id },
      data: {
        status: newStatus,
        cameraDate,
        lastUpdate: new Date(),
        lastOnline: isOnline ? new Date() : camera.lastOnline,
      },
    });

    // 4. SMART LOGGING
    const loggingResult = await smartStatusLogging(
      camera.id,
      newStatus,
      cameraDate ? `Camera date: ${cameraDate}` : undefined
    );

    if (loggingResult.shouldLog) {
      console.log(
        `[${camera.id}] [SMART LOG] Creating log: ${loggingResult.eventType}`
      );

      await createStatusLog(
        camera.id,
        loggingResult.eventType,
        cameraDate
          ? `Camera date: ${cameraDate}, Expected: ${today}`
          : `Status: ${newStatus}`
      );

      // 📱 KIRIM WHATSAPP ALERT JIKA STATUS BERUBAH
      if (
        statusChanged &&
        (newStatus === "offline" || newStatus === "date_error")
      ) {
        console.log(
          `[${camera.id}] 📱 Sending WhatsApp alert for status change`
        );
        try {
          await whatsappAlert(
            updatedCamera,
            newStatus,
            cameraDate || undefined
          );
          console.log(`[${camera.id}] 📱 WhatsApp alert sent successfully`);
        } catch (waError) {
          console.error(`[${camera.id}] 📱 WhatsApp alert failed:`, waError);
        }
      }
    }

    console.log(
      `[${camera.id}] [MONITOR END] Status: ${newStatus}, Changed: ${statusChanged}, Logged: ${loggingResult.shouldLog}\n`
    );

    return {
      statusChanged,
      newStatus,
      cameraDate,
      shouldLog: loggingResult.shouldLog,
      eventType: loggingResult.eventType,
    };
  } catch (error) {
    console.error(`[${camera.id}] [MONITOR ERROR]:`, error);

    // Untuk error, selalu log
    await createStatusLog(
      camera.id,
      "monitor_error",
      `Monitoring error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );

    await prisma.camera.update({
      where: { id: camera.id },
      data: {
        status: "error",
        lastUpdate: new Date(),
      },
    });

    return {
      statusChanged: true,
      newStatus: "error",
      cameraDate: null,
      shouldLog: true,
      eventType: "monitor_error",
    };
  }
}

export async function monitorCameraWithSocket(camera: any) {
  const result = await monitorCamera(camera);

  // Kirim update via WebSocket ke room camera specific
  if (result.statusChanged && (global as any).io) {
    (global as any).io.emitToCamera(camera.id, "camera_status_change", {
      id: camera.id,
      name: camera.name,
      ip: camera.ip,
      status: result.newStatus,
      cameraDate: result.cameraDate,
      lastUpdate: new Date(),
    });

    console.log(
      `📡 WebSocket update sent for ${camera.name}: ${result.newStatus}`
    );
  }

  return result;
}
