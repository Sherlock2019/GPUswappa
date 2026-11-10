/**
 * DEMO SEED — clearly fictional data for local development and demos only.
 * - Refuses to run when NODE_ENV=production.
 * - Every company, person, listing and price is fictional and labelled as demo/illustrative.
 * - Every public badge has a matching fictional review record (reviewer + date + evidence ref).
 * - Photos are freely-licensed illustrative images, labelled "not the actual unit", with credit.
 */
import { PrismaClient, type CheckType, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { promises as fs } from "fs";
import path from "path";
import { seedReference } from "./seed-reference";
import { storage } from "../src/lib/storage";
import { PHOTOS, type PhotoKey } from "../src/lib/photos";

const prisma = new PrismaClient();
const DAY = 86400000;
const ago = (days: number) => new Date(Date.now() - days * DAY);
const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production.");
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 10) throw new Error("Set SEED_DEMO_PASSWORD (≥10 chars) in .env before seeding.");

  await seedReference(prisma);
  console.log("✓ reference data (categories, models, provinces, badges, services, legal drafts)");

  if (await prisma.user.findUnique({ where: { email: "admin@example.com" } })) {
    console.log("Demo data already present — skipping listings/cases. Run `npm run db:reset` to start fresh.");
    await seedExtras(password);
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const mkUser = (email: string, name: string, role: "ADMIN" | "REVIEWER" | "BROKER" | "SELLER" | "BUYER") =>
    prisma.user.create({ data: { email, name, role, passwordHash: hash } });
  const admin = await mkUser("admin@example.com", "Demo Admin (fictional)", "ADMIN");
  const reviewer = await mkUser("reviewer@example.com", "Demo Reviewer (fictional)", "REVIEWER");
  const broker = await mkUser("broker@example.com", "Demo Broker An (fictional)", "BROKER");
  await mkUser("broker2@example.com", "Demo Broker Binh (fictional)", "BROKER");
  const seller = await mkUser("seller@example.com", "Demo Seller (fictional)", "SELLER");
  const seller2 = await mkUser("seller2@example.com", "Demo Seller Two (fictional)", "SELLER");
  const buyer = await mkUser("buyer@example.com", "Demo Buyer (fictional)", "BUYER");
  console.log("✓ demo users");

  const loc = Object.fromEntries((await prisma.location.findMany()).map((l) => [l.code, l.id]));
  const cat = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  const model = Object.fromEntries((await prisma.gpuModel.findMany()).map((m) => [m.name, m]));

  const mkCompany = (data: Omit<Prisma.CompanyUncheckedCreateInput, "isDemo" | "verificationStatus">, userId: string) =>
    prisma.company.create({
      data: { ...data, isDemo: true, verificationStatus: "VERIFIED", memberships: { create: { userId, roleInCompany: "Director", authorizationStatus: "AUTHORIZED" } } },
    });
  const saoMai = await mkCompany(
    {
      alias: "VN-S-1024",
      legalName: "Công ty TNHH Hạ tầng Số Sao Mai (hư cấu / fictional)",
      displayName: "Sao Mai Digital Infrastructure (demo)",
      registrationNumber: "DEMO-0101",
      companyType: "DATA_CENTRE",
      address: "Số 1 Đường Demo, Quận Hư Cấu (fictional address)",
      locationId: loc["ho-chi-minh"],
      website: "https://saomai.example",
      contactName: "Nguyễn Văn Demo",
      contactEmail: "sales@saomai.example",
      contactPhone: "0000 000 001",
    },
    seller.id,
  );
  const mekong = await mkCompany(
    {
      alias: "VN-S-3307",
      legalName: "Công ty Cổ phần Mekong Compute (hư cấu / fictional)",
      displayName: "Mekong Compute (demo)",
      registrationNumber: "DEMO-0202",
      companyType: "CLOUD_PROVIDER",
      address: "Số 2 Phố Demo, Quận Hư Cấu (fictional address)",
      locationId: loc["ha-noi"],
      website: "https://mekong-compute.example",
      contactName: "Trần Thị Demo",
      contactEmail: "assets@mekong-compute.example",
      contactPhone: "0000 000 002",
      foreignInvested: true,
    },
    seller2.id,
  );
  const lotus = await mkCompany(
    {
      alias: "VN-B-2048",
      legalName: "Công ty Cổ phần Phòng thí nghiệm AI Hoa Sen (hư cấu / fictional)",
      displayName: "Lotus AI Lab (demo)",
      registrationNumber: "DEMO-0303",
      companyType: "AI_STARTUP",
      address: "Số 3 Ngõ Demo, Quận Hư Cấu (fictional address)",
      locationId: loc["da-nang"],
      website: "https://lotus-ai.example",
      contactName: "Lê Văn Demo",
      contactEmail: "infra@lotus-ai.example",
      contactPhone: "0000 000 003",
    },
    buyer.id,
  );
  console.log("✓ fictional companies (VN-S-1024, VN-S-3307, VN-B-2048)");

  // Copy illustrative photos into PRIVATE storage so they are served through the same authorised route as real uploads.
  // (one private copy per listing image, since storage keys are unique)
  const photoCopy = async (k: PhotoKey) => storage().put(await fs.readFile(path.join(process.cwd(), "public", PHOTOS[k].src)), "jpg");

  type Demo = {
    seller: typeof saoMai;
    title: string;
    description: string;
    category: string;
    manufacturer?: "NVIDIA" | "AMD" | "SERVER_MANUFACTURER" | "OTHER";
    model?: string;
    qty?: number;
    loc: string;
    price?: bigint;
    onRequest?: boolean;
    condition: "NEW" | "UNUSED" | "USED" | "REFURBISHED";
    txn: "SALE" | "SWAP" | "SALE_OR_SWAP";
    warranty: "MANUFACTURER" | "SELLER" | "NONE" | "UNKNOWN";
    warrantyDetails?: string;
    tech?: Partial<Prisma.ListingUncheckedCreateInput>;
    faults?: string;
    photo: PhotoKey;
    passed: CheckType[];
    days: number;
    feeCredit?: boolean;
  };

  const demos: Demo[] = [
    {
      seller: saoMai,
      title: "Máy chủ 8× NVIDIA H100 SXM5 80GB đã qua sử dụng — TP.HCM (demo)",
      description:
        "DỮ LIỆU DEMO HƯ CẤU. Máy chủ 8 GPU H100 SXM5, đã vận hành khoảng 14 tháng trong phòng máy có kiểm soát nhiệt độ. Dư thừa sau khi dự án huấn luyện kết thúc. Có thể kiểm tra trực tiếp theo lịch hẹn qua môi giới.",
      category: "gpu-servers",
      manufacturer: "NVIDIA",
      model: "NVIDIA H100",
      qty: 8,
      loc: "ho-chi-minh",
      price: 6_500_000_000n,
      condition: "USED",
      txn: "SALE",
      warranty: "SELLER",
      warrantyDetails: "Bảo hành người bán 3 tháng cho lỗi phần cứng (minh hoạ).",
      tech: { gpuMemory: "80 GB HBM3 / GPU", serverManufacturer: "Server manufacturer (generic)", serverModel: "8-GPU HGX-class chassis", cpu: "2× 56-core x86 CPU", systemRam: "2 TB DDR5", storage: "8× 3.84 TB NVMe", networking: "8× 400G InfiniBand NDR, 2× 100GbE", powerRequirements: "~10 kW, 6× PSU", coolingRequirements: "Air-cooled, data-centre aisle", usageDetails: "~14 tháng, tải huấn luyện", equipmentAge: "2 năm" },
      faults: "Một quạt hệ thống đã được thay thế; không có lỗi đã biết khác.",
      photo: "h100Lineup",
      passed: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "EXPORT_CONTROL", "TECHNICAL_CONDITION"],
      days: 12,
    },
    {
      seller: mekong,
      title: "Used 4× NVIDIA A100 80GB server — Hanoi (demo)",
      description:
        "FICTIONAL DEMO DATA. 4-GPU A100 SXM server retired from a cloud inference cluster after an upgrade. Burn-in report available for review. Inspection by video or on site, arranged through the broker.",
      category: "gpu-servers",
      manufacturer: "NVIDIA",
      model: "NVIDIA A100",
      qty: 4,
      loc: "ha-noi",
      price: 1_900_000_000n,
      condition: "USED",
      txn: "SALE",
      warranty: "NONE",
      tech: { gpuMemory: "80 GB HBM2e / GPU", serverModel: "4-GPU 2U server (generic)", cpu: "2× 32-core x86", systemRam: "1 TB DDR4", storage: "4× 1.92 TB NVMe", networking: "2× 200G HDR", powerRequirements: "~4.5 kW", coolingRequirements: "Air-cooled", usageDetails: "~30 months inference", equipmentAge: "3 years" },
      photo: "dcRacks",
      passed: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "EXPORT_CONTROL", "TECHNICAL_CONDITION"],
      days: 40,
    },
    {
      seller: saoMai,
      title: "Máy trạm NVIDIA L40S mới, chưa sử dụng — Đà Nẵng (demo)",
      description: "DỮ LIỆU DEMO HƯ CẤU. Máy trạm 2× L40S còn nguyên hộp, mua dư cho dự án thị giác máy tính. Bảo hành hãng còn hiệu lực theo tài liệu (minh hoạ).",
      category: "gpu-workstations",
      manufacturer: "NVIDIA",
      model: "NVIDIA L40S",
      qty: 2,
      loc: "da-nang",
      price: 650_000_000n,
      condition: "NEW",
      txn: "SALE",
      warranty: "MANUFACTURER",
      warrantyDetails: "Bảo hành hãng còn khoảng 30 tháng (minh hoạ).",
      tech: { gpuMemory: "48 GB GDDR6 / GPU", cpu: "1× 32-core workstation CPU", systemRam: "512 GB", storage: "2× 3.84 TB NVMe", networking: "2× 25GbE", powerRequirements: "~1.8 kW", coolingRequirements: "Office or rack, air-cooled" },
      photo: "h100Standing",
      passed: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "WARRANTY_EVIDENCE", "EXPORT_CONTROL"],
      days: 5,
    },
    {
      seller: mekong,
      title: "Used 8× AMD Instinct MI300X server — Ho Chi Minh City (demo)",
      description: "FICTIONAL DEMO DATA. 8-GPU MI300X OAM platform, surplus after a capacity re-plan. Price on request; serious enquiries through the broker.",
      category: "gpu-servers",
      manufacturer: "AMD",
      model: "AMD MI300X",
      qty: 8,
      loc: "ho-chi-minh",
      onRequest: true,
      condition: "USED",
      txn: "SALE",
      warranty: "UNKNOWN",
      tech: { gpuMemory: "192 GB HBM3 / GPU", serverModel: "8-GPU OAM platform (generic)", cpu: "2× 64-core x86", systemRam: "2 TB DDR5", networking: "8× 400GbE", powerRequirements: "~11 kW", coolingRequirements: "Air-cooled, high-density row" },
      photo: "dcServerRoom",
      passed: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "EXPORT_CONTROL"],
      days: 20,
    },
    {
      seller: saoMai,
      title: "Máy chủ 8× NVIDIA H200 — bán hoặc đổi lấy cụm A100 + chênh lệch (demo)",
      description: "DỮ LIỆU DEMO HƯ CẤU. Máy chủ 8× H200 141GB. Người bán cân nhắc bán hoặc đổi lấy 2 máy chủ A100 kèm khoản chênh lệch do các bên tự thoả thuận.",
      category: "gpu-servers",
      manufacturer: "NVIDIA",
      model: "NVIDIA H200",
      qty: 8,
      loc: "ho-chi-minh",
      price: 9_800_000_000n,
      condition: "USED",
      txn: "SALE_OR_SWAP",
      warranty: "SELLER",
      warrantyDetails: "Bảo hành người bán 6 tháng (minh hoạ).",
      tech: { gpuMemory: "141 GB HBM3e / GPU", serverModel: "8-GPU HGX-class chassis", cpu: "2× 64-core x86", systemRam: "2 TB DDR5", networking: "8× 400G NDR", powerRequirements: "~10.2 kW", coolingRequirements: "Air or rear-door liquid", usageDetails: "~6 tháng" },
      photo: "h100Standing",
      passed: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "EXPORT_CONTROL"],
      days: 3,
      feeCredit: true,
    },
    {
      seller: mekong,
      title: "InfiniBand NDR 400G 64-port switch — Hanoi (demo)",
      description: "FICTIONAL DEMO DATA. 64-port NDR InfiniBand switch with spare PSU and cables, decommissioned during a fabric redesign.",
      category: "networking",
      manufacturer: "OTHER",
      loc: "ha-noi",
      price: 420_000_000n,
      condition: "USED",
      txn: "SALE",
      warranty: "NONE",
      tech: { networking: "64× 400G NDR ports", powerRequirements: "~1.7 kW, redundant PSU", coolingRequirements: "Front-to-back airflow" },
      photo: "dcRackRear",
      passed: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS"],
      days: 25,
    },
    {
      seller: saoMai,
      title: "Máy trạm 4× RTX 4090 cho suy luận — Hải Phòng (demo)",
      description: "DỮ LIỆU DEMO HƯ CẤU. Máy trạm 4 GPU RTX 4090 dùng cho thử nghiệm suy luận, có báo cáo xoá dữ liệu ổ lưu trữ (minh hoạ).",
      category: "gpu-workstations",
      manufacturer: "NVIDIA",
      model: "NVIDIA RTX 4090",
      qty: 4,
      loc: "hai-phong",
      price: 280_000_000n,
      condition: "USED",
      txn: "SALE_OR_SWAP",
      warranty: "NONE",
      tech: { gpuMemory: "24 GB GDDR6X / GPU", cpu: "1× 24-core", systemRam: "256 GB", storage: "2× 2 TB NVMe", powerRequirements: "~2.4 kW", coolingRequirements: "Air-cooled" },
      photo: "h100Lineup",
      passed: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "DATA_SANITISATION"],
      days: 8,
    },
    {
      seller: mekong,
      title: "Rack & power package: 4× 42U racks, PDUs, in-row cooling — Dong Nai (demo)",
      description: "FICTIONAL DEMO DATA. Four 42U racks with metered PDUs and two in-row cooling units, removed during a hall consolidation.",
      category: "racks-power-cooling",
      manufacturer: "OTHER",
      loc: "dong-nai",
      price: 350_000_000n,
      condition: "USED",
      txn: "SALE",
      warranty: "NONE",
      tech: { powerRequirements: "Metered PDUs, 3-phase", coolingRequirements: "2× in-row units, ~30 kW each (illustrative)" },
      photo: "dcCern",
      passed: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE"],
      days: 15,
    },
  ];

  const created: { id: string; title: string; sellerCompanyId: string; publishedAt: Date; agreementId: string }[] = [];
  let baSeq = 1;
  for (const d of demos) {
    const publishedAt = ago(d.days);
    const m = d.model ? model[d.model] : null;
    const listing = await prisma.listing.create({
      data: {
        sellerCompanyId: d.seller.id,
        createdById: d.seller.id === saoMai.id ? seller.id : seller2.id,
        title: d.title,
        description: d.description,
        contentLanguage: /[ăâđêôơư]/i.test(d.title) ? "vi" : "en",
        categoryId: cat[d.category],
        manufacturer: d.manufacturer ?? null,
        gpuModelId: m?.id ?? null,
        gpuQuantity: d.qty ?? 0,
        ...d.tech,
        condition: d.condition,
        hasKnownFaults: d.faults ? "YES" : "NO",
        knownDefects: d.faults ?? null,
        locationId: loc[d.loc],
        inVietnam: "YES",
        ownership: "OWNS",
        encumbrance: "NONE",
        customsStatus: "CLEARED_DOMESTIC",
        serialNumbers: "DEMO-SN-0000000001, DEMO-SN-0000000002 (fictional, private)",
        priceVnd: d.price ?? null,
        priceOnRequest: !!d.onRequest,
        priceIllustrative: true,
        transactionType: d.txn,
        warrantyStatus: d.warranty,
        warrantyDetails: d.warrantyDetails ?? null,
        deliveryOptions: "Giao trong nước theo thoả thuận / Domestic delivery by agreement",
        installationOptions: "Có thể hỗ trợ qua đối tác / Partner installation possible",
        platformRole: "INTERMEDIARY",
        publicationStatus: "PUBLISHED",
        reviewStatus: "COMPLETED",
        exportReviewRequired: !!m?.exportReviewFlag,
        reviewFlags: m?.exportReviewFlag ? ["EXPORT_REVIEW"] : [],
        assignedReviewerId: reviewer.id,
        brokerId: broker.id,
        isDemo: true,
        submittedAt: ago(d.days + 2),
        publishedAt,
        lastVerifiedAt: ago(d.days + 1),
        images: {
          create: {
            storageKey: await photoCopy(d.photo),
            contentType: "image/jpeg",
            altText: `${PHOTOS[d.photo].altEn} — illustrative image, not the actual unit`,
            approvalStatus: "APPROVED",
            isIllustrative: true,
            credit: `${PHOTOS[d.photo].author}, ${PHOTOS[d.photo].license} — ${PHOTOS[d.photo].sourceUrl}`,
          },
        },
      },
    });
    // Review checks: every PASSED badge has a fictional reviewer record + evidence reference.
    const allChecks: CheckType[] = ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "ASSET_IDENTIFICATION", "TECHNICAL_CONDITION", "WARRANTY_EVIDENCE", "DATA_SANITISATION", "EXPORT_CONTROL"];
    for (const ct of allChecks) {
      const passed = d.passed.includes(ct);
      await prisma.reviewCheck.create({
        data: {
          listingId: listing.id,
          checkType: ct,
          status: passed ? "PASSED" : ct === "EXPORT_CONTROL" && !m?.exportReviewFlag ? "NOT_APPLICABLE" : "NOT_STARTED",
          reviewerId: passed ? reviewer.id : null,
          reviewedAt: passed ? ago(d.days + 1) : null,
          evidenceRef: passed ? `DEMO-EVID-${ct}-${listing.id.slice(-4)} (fictional)` : null,
          internalNotes: passed ? "Fictional demo review record." : null,
          publicBadge: passed && ct !== "FINANCING_LEASE",
        },
      });
    }
    await prisma.reviewDecision.create({ data: { listingId: listing.id, actorId: admin.id, kind: "DECISION", outcome: "APPROVE", reason: "Demo approval (fictional)." } });
    const ag = await prisma.brokerageAgreement.create({
      data: {
        reference: `BA-2026-${String(baSeq++).padStart(4, "0")}`,
        sellerCompanyId: d.seller.id,
        listingId: listing.id,
        authorizedRepresentative: d.seller.id === saoMai.id ? "Nguyễn Văn Demo, Director (fictional)" : "Trần Thị Demo, CEO (fictional)",
        documentVersion: "BA-DRAFT-2026-11",
        listingFeeCredit: !!d.feeCredit,
        acceptedAt: ago(d.days + 3),
        acceptanceMethod: "WEB_CLICKWRAP",
        acceptedById: d.seller.id === saoMai.id ? seller.id : seller2.id,
        status: "ACTIVE",
        startDate: publishedAt,
        endDate: addMonths(publishedAt, 6),
      },
    });
    // Listing fee periods: monthly from publication.
    let start = publishedAt;
    let i = 0;
    while (start <= new Date()) {
      const isOld = addMonths(start, 1) <= new Date();
      await prisma.listingFee.create({
        data: {
          listingId: listing.id,
          periodStart: start,
          periodEnd: addMonths(start, 1),
          dueDate: new Date(start.getTime() + 14 * DAY),
          usdEquivalent: 100,
          status: isOld ? "PAID" : "DUE",
          ...(isOld ? { billedCurrency: "USD", billedAmount: 100n, invoiceRef: `DEMO-INV-${listing.id.slice(-4)}-${i + 1} (fictional)`, fxBasis: "Demo — no real billing", paidAt: new Date(start.getTime() + 7 * DAY), recordedById: admin.id } : {}),
        },
      });
      start = addMonths(start, 1);
      i++;
    }
    created.push({ id: listing.id, title: listing.title, sellerCompanyId: d.seller.id, publishedAt, agreementId: ag.id });
  }
  console.log(`✓ ${created.length} published demo listings with review records, active agreements and fee periods`);

  // Listings in the review queue (not public)
  const pending = await prisma.listing.create({
    data: {
      sellerCompanyId: saoMai.id,
      createdById: seller.id,
      title: "2× NVIDIA A100 40GB PCIe cards (demo, under review)",
      description: "FICTIONAL DEMO DATA. Two PCIe A100 cards removed from a lab workstation.",
      categoryId: cat["gpu-cards"],
      manufacturer: "NVIDIA",
      gpuModelId: model["NVIDIA A100"].id,
      gpuQuantity: 2,
      condition: "USED",
      hasKnownFaults: "NO",
      locationId: loc["ho-chi-minh"],
      inVietnam: "YES",
      ownership: "OWNS",
      encumbrance: "NONE",
      customsStatus: "CLEARED_DOMESTIC",
      priceVnd: 260_000_000n,
      priceIllustrative: true,
      transactionType: "SALE",
      warrantyStatus: "NONE",
      publicationStatus: "UNDER_REVIEW",
      exportReviewRequired: true,
      reviewFlags: ["EXPORT_REVIEW"],
      assignedReviewerId: reviewer.id,
      brokerId: broker.id,
      isDemo: true,
      submittedAt: ago(1),
      images: { create: { storageKey: await photoCopy("h100Lineup"), contentType: "image/jpeg", altText: "Illustrative image — not the actual unit", isIllustrative: true, credit: PHOTOS.h100Lineup.author } },
      checks: { create: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "ASSET_IDENTIFICATION", "TECHNICAL_CONDITION", "WARRANTY_EVIDENCE", "DATA_SANITISATION", "EXPORT_CONTROL"].map((c) => ({ checkType: c as CheckType })) },
      agreements: { create: { reference: `BA-2026-${String(baSeq++).padStart(4, "0")}`, sellerCompanyId: saoMai.id, authorizedRepresentative: "Nguyễn Văn Demo (fictional)", documentVersion: "BA-DRAFT-2026-11", acceptedAt: ago(1), acceptanceMethod: "WEB_CLICKWRAP", acceptedById: seller.id, status: "ACCEPTED" } },
    },
  });
  await prisma.listing.create({
    data: {
      sellerCompanyId: mekong.id,
      createdById: seller2.id,
      title: "16× H100 cluster (2 nodes) — customs status unknown (demo, on hold)",
      description: "FICTIONAL DEMO DATA. Two 8-GPU nodes. Seller answered “Unknown” to customs status, which routes the listing to internal review (not an indication of wrongdoing).",
      categoryId: cat["gpu-clusters"],
      manufacturer: "NVIDIA",
      gpuModelId: model["NVIDIA H100"].id,
      gpuQuantity: 16,
      condition: "USED",
      hasKnownFaults: "NO",
      locationId: loc["bac-ninh"],
      inVietnam: "YES",
      ownership: "OWNS",
      encumbrance: "UNKNOWN",
      customsStatus: "UNKNOWN",
      priceOnRequest: true,
      transactionType: "SALE_OR_SWAP",
      warrantyStatus: "UNKNOWN",
      publicationStatus: "ON_HOLD",
      exportReviewRequired: true,
      reviewFlags: ["ENCUMBRANCE_UNKNOWN", "CUSTOMS_UNKNOWN", "EXPORT_REVIEW"],
      assignedReviewerId: reviewer.id,
      isDemo: true,
      submittedAt: ago(2),
      checks: { create: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "ASSET_IDENTIFICATION", "TECHNICAL_CONDITION", "WARRANTY_EVIDENCE", "DATA_SANITISATION", "EXPORT_CONTROL"].map((c) => ({ checkType: c as CheckType })) },
    },
  });
  await prisma.listing.create({ data: { sellerCompanyId: saoMai.id, createdById: seller.id, title: "Draft: spare NVLink bridges (demo)", isDemo: true } });
  void pending;
  console.log("✓ review-queue listings (under review, on hold, draft)");

  // ── Demo brokered case: A100 server, US$80,000 sale at 5% (illustrative) ──
  const a100 = created[1];
  const enq = await prisma.enquiry.create({
    data: {
      reference: "ENQ-2026-0001",
      listingId: a100.id,
      buyerId: buyer.id,
      buyerCompanyId: lotus.id,
      sellerCompanyId: mekong.id,
      brokerId: broker.id,
      message: "We need 4× A100 for fine-tuning. Is a burn-in report available, and can we inspect in Hanoi next week?",
      status: "INTRODUCED",
      sellerChannelOpen: true,
      createdAt: ago(20),
    },
  });
  const q = await prisma.message.create({ data: { enquiryId: enq.id, channel: "BUYER_BROKER", authorId: buyer.id, body: enq.message, createdAt: ago(20) } });
  await prisma.message.create({ data: { enquiryId: enq.id, channel: "INTERNAL", authorId: broker.id, body: "Buyer company verified (demo). Relaying technical questions only.", createdAt: ago(19) } });
  const relayed = await prisma.message.create({ data: { enquiryId: enq.id, channel: "SELLER_BROKER", authorId: broker.id, body: "Buyer VN-B-2048 asks whether a burn-in report is available and whether an inspection in Hanoi is possible next week.", relayOfId: q.id, approvedById: broker.id, createdAt: ago(19) } });
  const ans = await prisma.message.create({ data: { enquiryId: enq.id, channel: "SELLER_BROKER", authorId: seller2.id, body: "Yes, a 72-hour burn-in report is available. Video or on-site inspection is fine on weekdays.", createdAt: ago(18) } });
  await prisma.message.create({ data: { enquiryId: enq.id, channel: "BUYER_BROKER", authorId: broker.id, body: "Seller VN-S-3307 confirms a 72-hour burn-in report and weekday inspection availability.", relayOfId: ans.id, approvedById: broker.id, createdAt: ago(18) } });
  void relayed;
  await prisma.offer.create({ data: { enquiryId: enq.id, fromParty: "BUYER", amount: 80_000n, currency: "USD", terms: "Subject to inspection (illustrative)", status: "ACCEPTED", recordedById: buyer.id, relayedAt: ago(15), respondedAt: ago(14), createdAt: ago(16) } });
  await prisma.inspection.create({ data: { enquiryId: enq.id, listingId: a100.id, brokerId: broker.id, type: "VIDEO", scheduledAt: ago(13), location: "Seller facility, Hanoi (fictional, private)", participants: "Broker, buyer engineer, seller technician (fictional)", provider: "Video call", outcome: "PASSED", reportRef: "DEMO-INSP-0001 (fictional)" } });
  await prisma.buyerIntroAgreement.create({ data: { buyerUserId: buyer.id, buyerCompanyId: lotus.id, authorizedRepresentative: "Lê Văn Demo, CTO (fictional)", listingId: a100.id, enquiryId: enq.id, termsVersion: "BI-DRAFT-2026-11", brokerId: broker.id, acceptedAt: ago(20) } });
  const intro = await prisma.introduction.create({
    data: {
      enquiryId: enq.id,
      listingId: a100.id,
      sellerCompanyId: mekong.id,
      buyerCompanyId: lotus.id,
      brokerId: broker.id,
      approverId: admin.id,
      status: "COMPLETED",
      purpose: "Parties agreed price subject to sale agreement; introduction needed to sign the sale contract (demo).",
      sellerFieldsToBuyer: ["legalName", "contactName", "contactEmail"],
      buyerFieldsToSeller: ["legalName", "contactName", "contactEmail"],
      existingRelationship: "NONE",
      sellerDeclaredAt: ago(12),
      checklist: { sellerAgreementActive: true, buyerTermsAccepted: true, buyerCompanyProfile: true, sellerIdentityVerified: true, buyerIdentityVerified: true, listingApproved: true },
      agreementVersions: { brokerage: "BA-DRAFT-2026-11", buyerTerms: "BI-DRAFT-2026-11" },
      requestedAt: ago(12),
      approvedAt: ago(11),
      completedAt: ago(11),
    },
  });
  await prisma.disclosure.create({ data: { introductionId: intro.id, authorizedById: admin.id, recipientCompanyId: lotus.id, subjectCompanyId: mekong.id, fields: intro.sellerFieldsToBuyer, snapshot: { legalName: mekong.legalName, contactName: mekong.contactName!, contactEmail: mekong.contactEmail! }, createdAt: ago(11) } });
  await prisma.disclosure.create({ data: { introductionId: intro.id, authorizedById: admin.id, recipientCompanyId: mekong.id, subjectCompanyId: lotus.id, fields: intro.buyerFieldsToSeller, snapshot: { legalName: lotus.legalName, contactName: lotus.contactName!, contactEmail: lotus.contactEmail! }, createdAt: ago(11) } });
  await prisma.transaction.create({
    data: {
      reference: "TX-2026-0001",
      enquiryId: enq.id,
      listingId: a100.id,
      sellerCompanyId: mekong.id,
      buyerCompanyId: lotus.id,
      brokerId: broker.id,
      agreementId: a100.agreementId,
      introductionId: intro.id,
      salePrice: 80_000n,
      currency: "USD",
      commissionPct: 5,
      commissionAmount: 4_000n,
      listingFeeCredit: 0n,
      feeTrigger: "SALE_AGREEMENT_SIGNED",
      status: "SALE_AGREEMENT_SIGNED",
      commissionStatus: "DUE",
      notes: "ILLUSTRATIVE EXAMPLE ONLY — fictional parties and amounts.",
    },
  });
  for (const [action, resourceType, resourceId] of [
    ["INTRODUCTION_APPROVED", "Introduction", intro.id],
    ["IDENTITY_DISCLOSED", "Introduction", intro.id],
    ["INTRODUCTION_COMPLETED", "Introduction", intro.id],
  ] as const) {
    await prisma.auditEvent.create({ data: { actorId: admin.id, action, resourceType, resourceId, metadata: { demo: true }, createdAt: ago(11) } });
  }

  // A second, early-stage case: buyer enquiry on the H100 server awaiting broker review.
  const h100 = created[0];
  const enq2 = await prisma.enquiry.create({
    data: { reference: "ENQ-2026-0002", listingId: h100.id, buyerId: buyer.id, buyerCompanyId: lotus.id, sellerCompanyId: saoMai.id, brokerId: broker.id, message: "Interested in the 8× H100 server. What is the InfiniBand topology and is a sale-or-swap possible?", status: "UNDER_BROKER_REVIEW", createdAt: ago(1) },
  });
  await prisma.message.create({ data: { enquiryId: enq2.id, channel: "BUYER_BROKER", authorId: buyer.id, body: enq2.message, createdAt: ago(1) } });
  await prisma.buyerIntroAgreement.create({ data: { buyerUserId: buyer.id, buyerCompanyId: lotus.id, authorizedRepresentative: "Lê Văn Demo, CTO (fictional)", listingId: h100.id, enquiryId: enq2.id, termsVersion: "BI-DRAFT-2026-11", brokerId: broker.id, acceptedAt: ago(1) } });
  console.log("✓ demo broker cases (ENQ-2026-0001 introduced + TX-2026-0001; ENQ-2026-0002 under review)");

  await prisma.buyerRequest.create({ data: { buyerId: buyer.id, buyerCompanyId: lotus.id, categoryId: cat["gpu-servers"], gpuModelId: model["NVIDIA H200"].id, desiredEquipment: "1–2× 8-GPU H200 or H100 servers (demo request)", quantity: 16, locationId: loc["ho-chi-minh"], conditionPreference: "ANY", budgetMinVnd: 5_000_000_000n, budgetMaxVnd: 12_000_000_000n, hideBudget: true, requirements: "InfiniBand NDR preferred (fictional demo request).", visibility: "PUBLIC" } });
  console.log("✓ demo buyer request");
  await seedExtras(password);
}

/**
 * Idempotent extras (safe to run on an existing database):
 *  - 10 ready-to-use fictional SELLER accounts (seller@, seller2@ … seller10@) and
 *    10 BUYER accounts (buyer@, buyer2@ … buyer10@), each with a VERIFIED fictional company + alias;
 *  - a clearly-labelled DEMO USD/VND rate so the English site can show indicative USD prices
 *    (only set if no rate is configured; replace it in Admin › Content).
 */
async function seedExtras(password: string) {
  const fxDefaults: Record<string, string> = {
    "fx.usdVndRate": "26300",
    "fx.rateDate": new Date().toISOString().slice(0, 10),
    "fx.source": "DEMO rate for illustration only — replace with an official reference rate in Admin › Content",
  };
  if (!(await prisma.siteSetting.findUnique({ where: { key: "fx.usdVndRate" } }))) {
    for (const [key, value] of Object.entries(fxDefaults)) await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: {} });
    console.log("✓ demo USD/VND rate (labelled as demo)");
  }

  const loc = Object.fromEntries((await prisma.location.findMany()).map((l) => [l.code, l.id]));
  const hash = await bcrypt.hash(password, 12);
  const cities = ["ho-chi-minh", "ha-noi", "da-nang", "hai-phong", "can-tho", "bac-ninh", "dong-nai", "khanh-hoa", "hue", "quang-ninh"];
  type Co = [string, string, Prisma.CompanyCreateInput["companyType"]];
  // 3 additional used-GPU sellers (+ seller@, seller2@ = 5) and 4 additional used-GPU buyers (+ buyer@ = 5)
  const sellers: Co[] = [
    ["Kim Long Data Centre", "Công ty TNHH Trung tâm Dữ liệu Kim Long", "DATA_CENTRE"],
    ["Red River Cloud", "Công ty CP Đám mây Sông Hồng", "CLOUD_PROVIDER"],
    ["Truong Son Compute", "Công ty TNHH Điện toán Trường Sơn", "SYSTEM_INTEGRATOR"],
  ];
  const sellerListings: { model: string; qty: number; title: string; price: bigint; loc: string; photo: PhotoKey; mem: string }[] = [
    { model: "NVIDIA A100", qty: 8, title: "Used 8× NVIDIA A100 80GB SXM server — Ho Chi Minh City (demo)", price: 3_400_000_000n, loc: "ho-chi-minh", photo: "dcRacks", mem: "80 GB HBM2e / GPU" },
    { model: "NVIDIA H100", qty: 4, title: "Máy chủ 4× NVIDIA H100 PCIe 80GB đã qua sử dụng — Hà Nội (demo)", price: 3_100_000_000n, loc: "ha-noi", photo: "h100Lineup", mem: "80 GB HBM2e / GPU" },
    { model: "NVIDIA L40S", qty: 8, title: "Used 8× NVIDIA L40S inference server — Da Nang (demo)", price: 1_450_000_000n, loc: "da-nang", photo: "dcServerRoom", mem: "48 GB GDDR6 / GPU" },
  ];
  const buyers: Co[] = [
    ["Saigon NLP", "Công ty TNHH Xử lý Ngôn ngữ Sài Gòn", "AI_STARTUP"],
    ["Hanoi Research Institute of Computing", "Viện Nghiên cứu Điện toán Hà Nội", "RESEARCH_INSTITUTION"],
    ["Golden Star Fintech", "Công ty CP Công nghệ Tài chính Sao Vàng", "ENTERPRISE"],
    ["Dragon Bridge Robotics", "Công ty CP Robot Cầu Rồng", "AI_STARTUP"],
  ];
  const buyerWants = [
    "Used 8-GPU A100 or H100 server for LLM fine-tuning (demo request)",
    "2–4 used H100/H200 servers for a university research cluster (demo request)",
    "Used 4× L40S or A100 node for inference, budget-limited (demo request)",
    "Used GPU workstation(s), 4× RTX 4090 or L40S, for robotics simulation (demo request)",
  ];
  const make = async (email: string, role: "SELLER" | "BUYER", alias: string, [display, legal, type]: Co, i: number) => {
    if (await prisma.user.findUnique({ where: { email } })) return null;
    const user = await prisma.user.create({ data: { email, name: `${display} — Demo User (fictional)`, role, passwordHash: hash } });
    await prisma.company.create({
      data: {
        alias,
        legalName: `${legal} (hư cấu / fictional)`,
        displayName: `${display} (demo)`,
        registrationNumber: `DEMO-${alias.slice(-4)}`,
        companyType: type,
        address: `Số ${i + 10} Đường Demo (fictional address)`,
        locationId: loc[cities[i % cities.length]],
        website: `https://${display.toLowerCase().replace(/[^a-z]+/g, "-")}.example`,
        contactName: `Demo Contact ${i + 1}`,
        contactEmail: email.replace("@example.com", ".contact@example.com"),
        contactPhone: `0000 000 ${String(100 + i).padStart(3, "0")}`,
        isDemo: true,
        verificationStatus: "VERIFIED",
        memberships: { create: { userId: user.id, roleInCompany: "Director", authorizationStatus: "AUTHORIZED" } },
      },
    });
    return { user, company: await prisma.company.findUniqueOrThrow({ where: { alias } }) };
  };

  const reviewer = await prisma.user.findUnique({ where: { email: "reviewer@example.com" } });
  const broker = await prisma.user.findUnique({ where: { email: "broker@example.com" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@example.com" } });
  const cat = await prisma.category.findUniqueOrThrow({ where: { slug: "gpu-servers" } });
  let created = 0;

  for (const [i, s] of sellers.entries()) {
    const r = await make(`seller${i + 3}@example.com`, "SELLER", `VN-S-${2103 + i}`, s, i);
    if (!r) continue;
    created++;
    // One published USED data-centre GPU listing per new seller, with matching fictional review records.
    const d = sellerListings[i];
    const model = await prisma.gpuModel.findUniqueOrThrow({ where: { name: d.model } });
    const publishedAt = new Date(Date.now() - (6 + i * 4) * 86400000);
    const passed: CheckType[] = ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "EXPORT_CONTROL", "TECHNICAL_CONDITION"];
    const all: CheckType[] = [...passed, "ASSET_IDENTIFICATION", "WARRANTY_EVIDENCE", "DATA_SANITISATION"];
    const listing = await prisma.listing.create({
      data: {
        sellerCompanyId: r.company.id,
        createdById: r.user.id,
        title: d.title,
        contentLanguage: /[ăâđêôơư]/i.test(d.title) ? "vi" : "en",
        description: "FICTIONAL DEMO DATA / DỮ LIỆU DEMO HƯ CẤU. Used data-centre GPU server, decommissioned after a capacity upgrade. Burn-in report available for review; inspection by video or on site through the broker.",
        categoryId: cat.id,
        manufacturer: "NVIDIA",
        gpuModelId: model.id,
        gpuQuantity: d.qty,
        gpuMemory: d.mem,
        serverModel: `${d.qty}-GPU server (generic)`,
        cpu: "2× x86 server CPU",
        systemRam: "1 TB DDR4/DDR5",
        storage: "NVMe SSDs",
        networking: "200/400G fabric",
        condition: "USED",
        hasKnownFaults: "NO",
        usageDetails: "18–30 months in a temperature-controlled hall (illustrative)",
        locationId: loc[d.loc],
        inVietnam: "YES",
        ownership: "OWNS",
        encumbrance: "NONE",
        customsStatus: "CLEARED_DOMESTIC",
        serialNumbers: "DEMO-SN-PRIVATE (fictional)",
        priceVnd: d.price,
        priceIllustrative: true,
        transactionType: i === 2 ? "SALE_OR_SWAP" : "SALE",
        warrantyStatus: "SELLER",
        warrantyDetails: "3-month seller warranty (illustrative)",
        deliveryOptions: "Domestic delivery by agreement",
        platformRole: "INTERMEDIARY",
        publicationStatus: "PUBLISHED",
        reviewStatus: "COMPLETED",
        exportReviewRequired: model.exportReviewFlag,
        reviewFlags: model.exportReviewFlag ? ["EXPORT_REVIEW"] : [],
        assignedReviewerId: reviewer?.id,
        brokerId: broker?.id,
        isDemo: true,
        submittedAt: publishedAt,
        publishedAt,
        lastVerifiedAt: publishedAt,
        images: {
          create: {
            storageKey: await storage().put(await fs.readFile(path.join(process.cwd(), "public", PHOTOS[d.photo].src)), "jpg"),
            contentType: "image/jpeg",
            altText: `${PHOTOS[d.photo].altEn} — illustrative image, not the actual unit`,
            approvalStatus: "APPROVED",
            isIllustrative: true,
            credit: `${PHOTOS[d.photo].author}, ${PHOTOS[d.photo].license} — ${PHOTOS[d.photo].sourceUrl}`,
          },
        },
        checks: {
          create: all.map((ct) => ({
            checkType: ct,
            status: passed.includes(ct) ? ("PASSED" as const) : ("NOT_STARTED" as const),
            reviewerId: passed.includes(ct) ? reviewer?.id : null,
            reviewedAt: passed.includes(ct) ? publishedAt : null,
            evidenceRef: passed.includes(ct) ? `DEMO-EVID-${ct} (fictional)` : null,
            publicBadge: passed.includes(ct) && ct !== "FINANCING_LEASE",
          })),
        },
        agreements: {
          create: {
            reference: `BA-2026-D${2103 + i}`,
            sellerCompanyId: r.company.id,
            authorizedRepresentative: `${s[0]} Director (fictional)`,
            documentVersion: "BA-DRAFT-2026-11",
            acceptedAt: publishedAt,
            acceptanceMethod: "WEB_CLICKWRAP",
            acceptedById: r.user.id,
            status: "ACTIVE",
            startDate: publishedAt,
            endDate: new Date(publishedAt.getTime() + 182 * 86400000),
          },
        },
        fees: { create: { periodStart: publishedAt, periodEnd: new Date(publishedAt.getTime() + 30 * 86400000), dueDate: new Date(publishedAt.getTime() + 14 * 86400000), usdEquivalent: 100, status: "DUE" } },
      },
    });
    if (admin) await prisma.reviewDecision.create({ data: { listingId: listing.id, actorId: admin.id, kind: "DECISION", outcome: "APPROVE", reason: "Demo approval (fictional)." } });
  }

  for (const [i, b] of buyers.entries()) {
    const r = await make(`buyer${i + 2}@example.com`, "BUYER", `VN-B-${4102 + i}`, b, i);
    if (!r) continue;
    created++;
    await prisma.buyerRequest.create({
      data: {
        buyerId: r.user.id,
        buyerCompanyId: r.company.id,
        categoryId: cat.id,
        desiredEquipment: buyerWants[i],
        quantity: [8, 16, 4, 4][i],
        locationId: loc[cities[i % cities.length]],
        conditionPreference: "USED",
        budgetMinVnd: [1_500_000_000n, 4_000_000_000n, 500_000_000n, 250_000_000n][i],
        budgetMaxVnd: [3_500_000_000n, 12_000_000_000n, 1_500_000_000n, 600_000_000n][i],
        hideBudget: i % 2 === 0,
        requirements: "Fictional demo request — used equipment located in Vietnam, inspection before purchase.",
        visibility: "PUBLIC",
      },
    });
  }
  if (created) console.log(`✓ ${created} additional used-GPU demo accounts (3 sellers with published used listings, 4 buyers with used-GPU requests)`);
  console.log("\nDemo accounts (password = SEED_DEMO_PASSWORD):");
  console.log("  staff:   admin@, reviewer@, broker@, broker2@ example.com");
  console.log("  used-GPU sellers (5): seller@, seller2@, seller3@, seller4@, seller5@ example.com");
  console.log("  used-GPU buyers  (5): buyer@, buyer2@, buyer3@, buyer4@, buyer5@ example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
