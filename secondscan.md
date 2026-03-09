Scanner API starting on port 3001...

> raawi-x@0.1.0 scanner:dev D:\Waheed\RaawiX
> pnpm --filter scanner dev


> @raawi-x/scanner@0.1.0 dev D:\Waheed\RaawiX\apps\scanner
> tsx watch src/index.ts

Scanner API server running on port 3001
Report UI origin: http://localhost:5173
Max concurrent scans: 5
Scan retention: 7 days
Database: enabled
[DB] Initializing Prisma client...
[DB] PrismaClient imported, creating instance...
[DB] PrismaClient instance created, testing connection...
[DB] Prisma client initialized successfully
[AUTH] Login request received
[AUTH] Body: {"email":"admin@local","password":"admin123"}
[AUTH] Content-Type: application/json
[AUTH] Looking up user: admin@local
[AUTH] User lookup result: Found: admin@local
[AUTH] Comparing password...
[AUTH] bcrypt.compare type: function
[AUTH] Password comparison result: true
[AUTH] Password valid, generating JWT token...
[AUTH] JWT token generated, sending response...
[AUTH] Login successful!
{"timestamp":"2026-01-08T10:44:22.922Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Scan created in database","entityId":"cc80fa9b-07c5-4234-956a-9c7eea6df330","propertyId":"83a9015e-e91b-46ca-afdb-bc819f556baf"}
{"timestamp":"2026-01-08T10:44:22.925Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Scan job created","seedUrl":"http://localhost:4173/messy","maxPages":1,"maxDepth":1,"entityId":"cc80fa9b-07c5-4234-956a-9c7eea6df330","propertyId":"83a9015e-e91b-46ca-afdb-bc819f556baf"}
{"timestamp":"2026-01-08T10:44:22.928Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"State transition","oldStatus":"queued","newStatus":"running"}
{"timestamp":"2026-01-08T10:44:22.928Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Scan execution started","seedUrl":"http://localhost:4173/messy","maxPages":1,"maxDepth":1}
{"timestamp":"2026-01-08T10:44:22.940Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Starting crawl","maxPages":1,"maxDepth":1}
[L1] Captured DOM/HTML for page 1: http://localhost:4173/messy
{"timestamp":"2026-01-08T10:44:30.712Z","level":"info","message":"Gemini Vision provider enabled"}
{"timestamp":"2026-01-08T10:44:30.716Z","level":"info","message":"Starting vision analysis","pageNumber":1,"url":"http://localhost:4173/messy"}
{"timestamp":"2026-01-08T10:44:30.973Z","level":"info","message":"Collected interactive candidates","pageNumber":1,"count":57}
{"timestamp":"2026-01-08T10:44:32.147Z","level":"info","message":"Vision analysis complete","pageNumber":1,"findingsCount":0}
[L2] Vision complete for page 1: 0 findings, screenshot: D:\Waheed\RaawiX\apps\scanner\output\scan_1767869062907_zgt6dpy\pages\1\screenshot.png
{"timestamp":"2026-01-08T10:44:32.536Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Crawl completed","pages":1,"successful":1,"failed":0}
{"timestamp":"2026-01-08T10:44:32.537Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Generating report"}
{"timestamp":"2026-01-08T10:44:34.710Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"State transition","oldStatus":"running","newStatus":"completed"}
{"timestamp":"2026-01-08T10:44:34.830Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Findings saved to database","count":10}
{"timestamp":"2026-01-08T10:44:34.836Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Report results saved to database"}
{"timestamp":"2026-01-08T10:44:34.840Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Scan status updated in database","status":"completed"}
{"timestamp":"2026-01-08T10:44:34.841Z","level":"info","scanId":"scan_1767869062907_zgt6dpy","message":"Scan completed successfully","pages":1,"durationMs":11907}
prisma:error
Invalid `prisma.scan.findUnique()` invocation in
D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:36

  33 const baseUrl = `${req.protocol}://${req.get('host')}`;
  34
  35 // Get scan with all relations
→ 36 const scan = await prisma.scan.findUnique({
       where: {
         scanId: "scan_1767869062907_zgt6dpy"
       },
       include: {
         entity: {
           select: {
             id: true,
             code: true,
             ~~~~
             nameEn: true,
             nameAr: true,
     ?       type?: true,
     ?       sector?: true,
     ?       status?: true,
     ?       notes?: true,
     ?       createdAt?: true,
     ?       updatedAt?: true,
     ?       contacts?: true,
     ?       properties?: true,
     ?       scans?: true,
     ?       _count?: true
           }
         },
         property: {
           select: {
             id: true,
             domain: true,
             displayNameEn: true,
             displayNameAr: true
           }
         },
         pages: {
           include: {
             findings: {
               select: {
                 id: true,
                 wcagId: true,
                 ruleId: true,
                 level: true,
                 status: true,
                 confidence: true,
                 message: true,
                 evidenceJson: true,
                 howToVerify: true
               },
               orderBy: [
                 {
                   level: "asc"
                 },
                 {
                   status: "asc"
                 },
                 {
                   wcagId: "asc"
                 }
               ]
             },
             visionFindings: {
               orderBy: {
                 confidence: "desc"
               }
             }
           },
           orderBy: {
             pageNumber: "asc"
           }
         },
         _count: {
           select: {
             pages: true,
             findings: true,
             visionFindings: true
           }
         }
       }
     })

Unknown field `code` for select statement on model `Entity`. Available options are marked with ?.
[SCAN-DETAIL] Error fetching scan detail: PrismaClientValidationError:
Invalid `prisma.scan.findUnique()` invocation in
D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:36

  33 const baseUrl = `${req.protocol}://${req.get('host')}`;
  34
  35 // Get scan with all relations
→ 36 const scan = await prisma.scan.findUnique({
       where: {
         scanId: "scan_1767869062907_zgt6dpy"
       },
       include: {
         entity: {
           select: {
             id: true,
             code: true,
             ~~~~
             nameEn: true,
             nameAr: true,
     ?       type?: true,
     ?       sector?: true,
     ?       status?: true,
     ?       notes?: true,
     ?       createdAt?: true,
     ?       updatedAt?: true,
     ?       contacts?: true,
     ?       properties?: true,
     ?       scans?: true,
     ?       _count?: true
           }
         },
         property: {
           select: {
             id: true,
             domain: true,
             displayNameEn: true,
             displayNameAr: true
           }
         },
         pages: {
           include: {
             findings: {
               select: {
                 id: true,
                 wcagId: true,
                 ruleId: true,
                 level: true,
                 status: true,
                 confidence: true,
                 message: true,
                 evidenceJson: true,
                 howToVerify: true
               },
               orderBy: [
                 {
                   level: "asc"
                 },
                 {
                   status: "asc"
                 },
                 {
                   wcagId: "asc"
                 }
               ]
             },
             visionFindings: {
               orderBy: {
                 confidence: "desc"
               }
             }
           },
           orderBy: {
             pageNumber: "asc"
           }
         },
         _count: {
           select: {
             pages: true,
             findings: true,
             visionFindings: true
           }
         }
       }
     })

Unknown field `code` for select statement on model `Entity`. Available options are marked with ?.
    at throwValidationException (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async <anonymous> (D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:18) {
  clientVersion: '6.19.1'
}
prisma:error
Invalid `prisma.scan.findUnique()` invocation in
D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:36

  33 const baseUrl = `${req.protocol}://${req.get('host')}`;
  34
  35 // Get scan with all relations
→ 36 const scan = await prisma.scan.findUnique({
       where: {
         scanId: "scan_1767869062907_zgt6dpy"
       },
       include: {
         entity: {
           select: {
             id: true,
             code: true,
             ~~~~
             nameEn: true,
             nameAr: true,
     ?       type?: true,
     ?       sector?: true,
     ?       status?: true,
     ?       notes?: true,
     ?       createdAt?: true,
     ?       updatedAt?: true,
     ?       contacts?: true,
     ?       properties?: true,
     ?       scans?: true,
     ?       _count?: true
           }
         },
         property: {
           select: {
             id: true,
             domain: true,
             displayNameEn: true,
             displayNameAr: true
           }
         },
         pages: {
           include: {
             findings: {
               select: {
                 id: true,
                 wcagId: true,
                 ruleId: true,
                 level: true,
                 status: true,
                 confidence: true,
                 message: true,
                 evidenceJson: true,
                 howToVerify: true
               },
               orderBy: [
                 {
                   level: "asc"
                 },
                 {
                   status: "asc"
                 },
                 {
                   wcagId: "asc"
                 }
               ]
             },
             visionFindings: {
               orderBy: {
                 confidence: "desc"
               }
             }
           },
           orderBy: {
             pageNumber: "asc"
           }
         },
         _count: {
           select: {
             pages: true,
             findings: true,
             visionFindings: true
           }
         }
       }
     })

Unknown field `code` for select statement on model `Entity`. Available options are marked with ?.
[SCAN-DETAIL] Error fetching scan detail: PrismaClientValidationError:
Invalid `prisma.scan.findUnique()` invocation in
D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:36

  33 const baseUrl = `${req.protocol}://${req.get('host')}`;
  34
  35 // Get scan with all relations
→ 36 const scan = await prisma.scan.findUnique({
       where: {
         scanId: "scan_1767869062907_zgt6dpy"
       },
       include: {
         entity: {
           select: {
             id: true,
             code: true,
             ~~~~
             nameEn: true,
             nameAr: true,
     ?       type?: true,
     ?       sector?: true,
     ?       status?: true,
     ?       notes?: true,
     ?       createdAt?: true,
     ?       updatedAt?: true,
     ?       contacts?: true,
     ?       properties?: true,
     ?       scans?: true,
     ?       _count?: true
           }
         },
         property: {
           select: {
             id: true,
             domain: true,
             displayNameEn: true,
             displayNameAr: true
           }
         },
         pages: {
           include: {
             findings: {
               select: {
                 id: true,
                 wcagId: true,
                 ruleId: true,
                 level: true,
                 status: true,
                 confidence: true,
                 message: true,
                 evidenceJson: true,
                 howToVerify: true
               },
               orderBy: [
                 {
                   level: "asc"
                 },
                 {
                   status: "asc"
                 },
                 {
                   wcagId: "asc"
                 }
               ]
             },
             visionFindings: {
               orderBy: {
                 confidence: "desc"
               }
             }
           },
           orderBy: {
             pageNumber: "asc"
           }
         },
         _count: {
           select: {
             pages: true,
             findings: true,
             visionFindings: true
           }
         }
       }
     })

Unknown field `code` for select statement on model `Entity`. Available options are marked with ?.
    at throwValidationException (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async <anonymous> (D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:18) {
  clientVersion: '6.19.1'
}
prisma:error
Invalid `prisma.scan.findUnique()` invocation in
D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:36

  33 const baseUrl = `${req.protocol}://${req.get('host')}`;
  34
  35 // Get scan with all relations
→ 36 const scan = await prisma.scan.findUnique({
       where: {
         scanId: "scan_1767869062907_zgt6dpy"
       },
       include: {
         entity: {
           select: {
             id: true,
             code: true,
             ~~~~
             nameEn: true,
             nameAr: true,
     ?       type?: true,
     ?       sector?: true,
     ?       status?: true,
     ?       notes?: true,
     ?       createdAt?: true,
     ?       updatedAt?: true,
     ?       contacts?: true,
     ?       properties?: true,
     ?       scans?: true,
     ?       _count?: true
           }
         },
         property: {
           select: {
             id: true,
             domain: true,
             displayNameEn: true,
             displayNameAr: true
           }
         },
         pages: {
           include: {
             findings: {
               select: {
                 id: true,
                 wcagId: true,
                 ruleId: true,
                 level: true,
                 status: true,
                 confidence: true,
                 message: true,
                 evidenceJson: true,
                 howToVerify: true
               },
               orderBy: [
                 {
                   level: "asc"
                 },
                 {
                   status: "asc"
                 },
                 {
                   wcagId: "asc"
                 }
               ]
             },
             visionFindings: {
               orderBy: {
                 confidence: "desc"
               }
             }
           },
           orderBy: {
             pageNumber: "asc"
           }
         },
         _count: {
           select: {
             pages: true,
             findings: true,
             visionFindings: true
           }
         }
       }
     })

Unknown field `code` for select statement on model `Entity`. Available options are marked with ?.
[SCAN-DETAIL] Error fetching scan detail: PrismaClientValidationError:
Invalid `prisma.scan.findUnique()` invocation in
D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:36

  33 const baseUrl = `${req.protocol}://${req.get('host')}`;
  34
  35 // Get scan with all relations
→ 36 const scan = await prisma.scan.findUnique({
       where: {
         scanId: "scan_1767869062907_zgt6dpy"
       },
       include: {
         entity: {
           select: {
             id: true,
             code: true,
             ~~~~
             nameEn: true,
             nameAr: true,
     ?       type?: true,
     ?       sector?: true,
     ?       status?: true,
     ?       notes?: true,
     ?       createdAt?: true,
     ?       updatedAt?: true,
     ?       contacts?: true,
     ?       properties?: true,
     ?       scans?: true,
     ?       _count?: true
           }
         },
         property: {
           select: {
             id: true,
             domain: true,
             displayNameEn: true,
             displayNameAr: true
           }
         },
         pages: {
           include: {
             findings: {
               select: {
                 id: true,
                 wcagId: true,
                 ruleId: true,
                 level: true,
                 status: true,
                 confidence: true,
                 message: true,
                 evidenceJson: true,
                 howToVerify: true
               },
               orderBy: [
                 {
                   level: "asc"
                 },
                 {
                   status: "asc"
                 },
                 {
                   wcagId: "asc"
                 }
               ]
             },
             visionFindings: {
               orderBy: {
                 confidence: "desc"
               }
             }
           },
           orderBy: {
             pageNumber: "asc"
           }
         },
         _count: {
           select: {
             pages: true,
             findings: true,
             visionFindings: true
           }
         }
       }
     })

Unknown field `code` for select statement on model `Entity`. Available options are marked with ?.
    at throwValidationException (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async <anonymous> (D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:18) {
  clientVersion: '6.19.1'
}
prisma:error
Invalid `prisma.scan.findUnique()` invocation in
D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:36

  33 const baseUrl = `${req.protocol}://${req.get('host')}`;
  34
  35 // Get scan with all relations
→ 36 const scan = await prisma.scan.findUnique({
       where: {
         scanId: "scan_1767869062907_zgt6dpy"
       },
       include: {
         entity: {
           select: {
             id: true,
             code: true,
             ~~~~
             nameEn: true,
             nameAr: true,
     ?       type?: true,
     ?       sector?: true,
     ?       status?: true,
     ?       notes?: true,
     ?       createdAt?: true,
     ?       updatedAt?: true,
     ?       contacts?: true,
     ?       properties?: true,
     ?       scans?: true,
     ?       _count?: true
           }
         },
         property: {
           select: {
             id: true,
             domain: true,
             displayNameEn: true,
             displayNameAr: true
           }
         },
         pages: {
           include: {
             findings: {
               select: {
                 id: true,
                 wcagId: true,
                 ruleId: true,
                 level: true,
                 status: true,
                 confidence: true,
                 message: true,
                 evidenceJson: true,
                 howToVerify: true
               },
               orderBy: [
                 {
                   level: "asc"
                 },
                 {
                   status: "asc"
                 },
                 {
                   wcagId: "asc"
                 }
               ]
             },
             visionFindings: {
               orderBy: {
                 confidence: "desc"
               }
             }
           },
           orderBy: {
             pageNumber: "asc"
           }
         },
         _count: {
           select: {
             pages: true,
             findings: true,
             visionFindings: true
           }
         }
       }
     })

Unknown field `code` for select statement on model `Entity`. Available options are marked with ?.
[SCAN-DETAIL] Error fetching scan detail: PrismaClientValidationError:
Invalid `prisma.scan.findUnique()` invocation in
D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:36

  33 const baseUrl = `${req.protocol}://${req.get('host')}`;
  34
  35 // Get scan with all relations
→ 36 const scan = await prisma.scan.findUnique({
       where: {
         scanId: "scan_1767869062907_zgt6dpy"
       },
       include: {
         entity: {
           select: {
             id: true,
             code: true,
             ~~~~
             nameEn: true,
             nameAr: true,
     ?       type?: true,
     ?       sector?: true,
     ?       status?: true,
     ?       notes?: true,
     ?       createdAt?: true,
     ?       updatedAt?: true,
     ?       contacts?: true,
     ?       properties?: true,
     ?       scans?: true,
     ?       _count?: true
           }
         },
         property: {
           select: {
             id: true,
             domain: true,
             displayNameEn: true,
             displayNameAr: true
           }
         },
         pages: {
           include: {
             findings: {
               select: {
                 id: true,
                 wcagId: true,
                 ruleId: true,
                 level: true,
                 status: true,
                 confidence: true,
                 message: true,
                 evidenceJson: true,
                 howToVerify: true
               },
               orderBy: [
                 {
                   level: "asc"
                 },
                 {
                   status: "asc"
                 },
                 {
                   wcagId: "asc"
                 }
               ]
             },
             visionFindings: {
               orderBy: {
                 confidence: "desc"
               }
             }
           },
           orderBy: {
             pageNumber: "asc"
           }
         },
         _count: {
           select: {
             pages: true,
             findings: true,
             visionFindings: true
           }
         }
       }
     })

Unknown field `code` for select statement on model `Entity`. Available options are marked with ?.
    at throwValidationException (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\core\errorRendering\throwValidationException.ts:45:9)
    at ei.handleRequestError (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:202:7)
    at ei.handleAndLogRequestError (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:174:12)
    at ei.request (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\RequestHandler.ts:143:12)
    at async a (D:\Waheed\RaawiX\node_modules\.pnpm\@prisma+client@6.19.1_prism_d4c309513f45d21f4e4aa7921d8002c7\node_modules\@prisma\client\src\runtime\getPrismaClient.ts:833:24)
    at async <anonymous> (D:\Waheed\RaawiX\apps\scanner\src\api\scan-detail.ts:36:18) {
  clientVersion: '6.19.1'
}
