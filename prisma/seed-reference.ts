/* Reference data shared by the demo seed and the automated tests. Safe to run repeatedly (upserts). */
import type { CheckType, Manufacturer, PrismaClient, ServiceStatus } from "@prisma/client";

export const CATEGORIES = [
  ["gpu-cards", "Card GPU rời", "Individual GPU cards"],
  ["gpu-servers", "Máy chủ GPU", "GPU servers"],
  ["gpu-workstations", "Máy trạm GPU", "GPU workstations"],
  ["gpu-clusters", "Cụm GPU hoàn chỉnh", "Complete GPU clusters"],
  ["networking", "Mạng & InfiniBand", "Networking and InfiniBand"],
  ["storage", "Lưu trữ", "Storage"],
  ["racks-power-cooling", "Tủ rack, phân phối điện & làm mát", "Racks, power distribution, and cooling"],
  ["parts", "Linh kiện & phụ kiện", "Spare parts and accessories"],
] as const;

// exportReviewFlag = configurable policy flag requiring case-by-case HUMAN review. Not a licensing claim.
export const GPU_MODELS: [string, Manufacturer, number | null, boolean][] = [
  ["NVIDIA H100", "NVIDIA", 80, true],
  ["NVIDIA H200", "NVIDIA", 141, true],
  ["NVIDIA A100", "NVIDIA", 80, true],
  ["NVIDIA L40S", "NVIDIA", 48, true],
  ["NVIDIA RTX 4090", "NVIDIA", 24, false],
  ["AMD MI300X", "AMD", 192, true],
  ["AMD MI325X", "AMD", 256, true],
  ["Other", "OTHER", null, false],
];

export const LOCATIONS = [
  ["ha-noi", "Hà Nội", "Hanoi"],
  ["ho-chi-minh", "TP. Hồ Chí Minh", "Ho Chi Minh City"],
  ["da-nang", "Đà Nẵng", "Da Nang"],
  ["hai-phong", "Hải Phòng", "Hai Phong"],
  ["can-tho", "Cần Thơ", "Can Tho"],
  ["hue", "Huế", "Hue"],
  ["bac-ninh", "Bắc Ninh", "Bac Ninh"],
  ["quang-ninh", "Quảng Ninh", "Quang Ninh"],
  ["dong-nai", "Đồng Nai", "Dong Nai"],
  ["khanh-hoa", "Khánh Hòa", "Khanh Hoa"],
  ["lam-dong", "Lâm Đồng", "Lam Dong"],
  ["thai-nguyen", "Thái Nguyên", "Thai Nguyen"],
  ["other", "Tỉnh/thành khác", "Other province"],
] as const;

const NOT_GOV = {
  vi: "Không phải phê duyệt của cơ quan nhà nước, không phải bảo đảm pháp lý hay bảo đảm chất lượng.",
  en: "Not a government approval, legal guarantee or quality guarantee.",
};

export const BADGES: [CheckType, string, string, string, string][] = [
  ["SELLER_IDENTITY", "Đã xem xét danh tính công ty", "Company identity reviewed", "Người xem xét đã đối chiếu thông tin đăng ký doanh nghiệp của người bán với tài liệu được cung cấp.", "A reviewer compared the seller's business registration details with the documents provided."],
  ["SELLER_AUTHORITY", "Đã xem xét quyền bán", "Seller authority reviewed", "Người xem xét đã xem tài liệu cho thấy người đăng tin có quyền bán thay mặt công ty.", "A reviewer saw documents indicating the person listing is authorised to sell on the company's behalf."],
  ["OWNERSHIP_EVIDENCE", "Đã xem xét bằng chứng sở hữu", "Ownership evidence reviewed", "Người xem xét đã xem hoá đơn hoặc bằng chứng sở hữu thay thế cho thiết bị.", "A reviewer saw an invoice or alternative ownership evidence for the equipment."],
  ["CUSTOMS_STATUS", "Đã xem xét tình trạng hải quan", "Customs status reviewed", "Người xem xét đã xem tài liệu về tình trạng nhập khẩu/hải quan do người bán cung cấp.", "A reviewer saw documents about import/customs status provided by the seller."],
  ["TECHNICAL_CONDITION", "Có báo cáo kỹ thuật", "Technical report available", "Có báo cáo kỹ thuật và người xem xét đã đọc báo cáo đó.", "A technical report exists and a reviewer has read it."],
  ["WARRANTY_EVIDENCE", "Đã xem xét thông tin bảo hành", "Warranty information reviewed", "Người xem xét đã xem tài liệu về bảo hành được mô tả trong tin đăng.", "A reviewer saw documents supporting the warranty described in the listing."],
  ["DATA_SANITISATION", "Có báo cáo xoá dữ liệu", "Data sanitisation report available", "Có báo cáo xoá dữ liệu từ nhà cung cấp và người xem xét đã đọc báo cáo đó.", "A sanitisation report from a provider exists and a reviewer has read it."],
  ["EXPORT_CONTROL", "Đã hoàn tất xem xét kiểm soát xuất khẩu (khi áp dụng)", "Export-control review completed, where applicable", "Người xem xét đã thực hiện xem xét kiểm soát xuất khẩu theo từng trường hợp cho giao dịch trong nước này.", "A reviewer completed a case-by-case export-control review for this domestic listing."],
];

export const SERVICES: [string, string, string, string, string, ServiceStatus, boolean][] = [
  ["valuation", "Định giá tài sản GPU", "GPU asset valuation", "Ước tính giá trị tham khảo cho thiết bị GPU dựa trên cấu hình và tình trạng.", "Indicative valuation of GPU equipment based on configuration and condition.", "CONTACT_US", false],
  ["inspection", "Kiểm tra & chẩn đoán phần cứng", "Hardware inspection and diagnostics", "Kiểm tra tình trạng, chạy chẩn đoán và lập báo cáo kỹ thuật.", "Condition checks, diagnostics and a technical report.", "AVAILABLE_THROUGH_PARTNER", false],
  ["document-review", "Xem xét quyền sở hữu & tài liệu", "Ownership and document review", "Xem xét tài liệu sở hữu và quyền bán trong quy trình duyệt tin.", "Review of ownership and authority documents in the listing review process.", "AVAILABLE", false],
  ["legal-customs", "Tư vấn hải quan & pháp lý qua chuyên gia", "Customs and legal review through qualified advisers", "Kết nối với tư vấn đủ chuyên môn. Nền tảng không cung cấp tư vấn pháp lý.", "Referral to qualified advisers. The platform does not provide legal advice.", "CONTACT_US", false],
  ["data-sanitisation", "Xoá dữ liệu qua nhà cung cấp phù hợp", "Data sanitisation through an appropriate provider", "Xoá dữ liệu trên ổ lưu trữ do nhà cung cấp chuyên trách thực hiện.", "Data sanitisation of storage media by a specialist provider.", "COMING_SOON", false],
  ["decommissioning", "Tháo dỡ & logistics", "Decommissioning and logistics", "Tháo dỡ, đóng gói và vận chuyển trong nước.", "De-racking, packing and domestic transport.", "COMING_SOON", false],
  ["installation", "Lắp đặt & tích hợp", "Installation and integration", "Lắp đặt tại trung tâm dữ liệu của người mua.", "Installation at the buyer's data centre.", "CONTACT_US", false],
  ["consulting", "Tư vấn hạ tầng GPU", "GPU infrastructure consulting", "Tư vấn cấu hình, điện, làm mát và mạng cho hạ tầng GPU.", "Advice on configuration, power, cooling and networking for GPU infrastructure.", "CONTACT_US", false],
  ["maintenance", "Bảo trì & hỗ trợ qua nhà cung cấp hợp đồng", "Maintenance and support through a contracted provider", "Bảo trì sau bán hàng do nhà cung cấp theo hợp đồng thực hiện.", "Post-sale maintenance by a contracted provider.", "COMING_SOON", false],
  ["gpu-cloud-rental", "Cho thuê GPU cloud", "GPU cloud rental", "Thuê năng lực GPU theo giờ hoặc theo tháng từ hạ tầng dư thừa tại Việt Nam — dành cho startup cần GPU mà chưa muốn mua thiết bị. Chưa hoạt động; nằm trong lộ trình giai đoạn 3.", "Rent GPU capacity by the hour or month from surplus infrastructure in Vietnam — for start-ups that need GPUs without buying hardware. Not operational; Phase 3 roadmap item.", "COMING_SOON", true],
  ["gpu-capacity-marketplace", "Sàn năng lực tính toán GPU", "GPU compute capacity marketplace", "Kết nối bên có công suất GPU nhàn rỗi với bên cần thuê ngắn hạn. Chưa hoạt động.", "Matching idle GPU capacity with short-term renters. Not operational.", "COMING_SOON", true],
  ["financing", "Tài trợ mua thiết bị", "Equipment financing", "Hợp tác với tổ chức tài chính được cấp phép trong tương lai. Chưa hoạt động.", "Future collaboration with licensed financial institutions. Not operational.", "COMING_SOON", true],
];

const DRAFT_VI = "Bản nháp — cần được luật sư Việt Nam rà soát trước khi ra mắt chính thức.";
const DRAFT_EN = "Draft — requires review by Vietnamese legal counsel before production launch.";

export const PAGES: [string, string, string, string, string][] = [
  [
    "terms",
    "Điều khoản sử dụng",
    "Terms of use",
    `${DRAFT_VI}\n\n## Phạm vi\nAI-GPU-Swapper do GPU Swap Vietnam vận hành là nền tảng trung gian B2B kết nối người bán và người mua thiết bị GPU đang có mặt tại Việt Nam.\n\n## Vai trò của nền tảng\n- Nền tảng không mua, sở hữu, lưu kho hay bán lại thiết bị, trừ khi tin đăng ghi rõ nền tảng là bên bán.\n- Nền tảng không thu, giữ hay chuyển tiền mua bán.\n- Giao dịch, thuế, bảo hành và giao nhận do các bên tự thoả thuận.\n\n## Không bảo đảm\nViệc duyệt tin đăng và huy hiệu kiểm tra không phải là bảo đảm pháp lý hay phê duyệt của cơ quan nhà nước.`,
    `${DRAFT_EN}\n\n## Scope\nAI-GPU-Swapper, operated by GPU Swap Vietnam, is a B2B intermediary platform connecting sellers and buyers of GPU equipment already located in Vietnam.\n\n## Role of the platform\n- The platform does not buy, own, warehouse or resell equipment unless a listing states that the platform is the seller.\n- The platform does not collect, hold or transfer purchase funds.\n- The transaction, taxes, warranties and delivery are governed by the parties' own agreements.\n\n## No guarantee\nListing approval and review badges are not a legal guarantee or a government approval.`,
  ],
  [
    "marketplace-rules",
    "Quy chế sàn",
    "Marketplace rules",
    `${DRAFT_VI}\n\n## Quy trình môi giới\n- Người mua gửi yêu cầu tới môi giới, không liên hệ trực tiếp người bán trước khi được giới thiệu.\n- Các bên được hiển thị bằng bí danh cho tới khi môi giới được phép giới thiệu, trừ thông tin pháp luật yêu cầu công khai.\n- Mọi lần tiết lộ danh tính đều được ghi nhận: ai cho phép, thông tin gì, khi nào và cho ai.`,
    `${DRAFT_EN}\n\n## Brokered process\n- Buyers send enquiries to the broker and do not contact sellers directly before an introduction.\n- Parties appear under aliases until a broker-authorised introduction, except information the law requires to be displayed.\n- Every identity disclosure is recorded: who authorised it, what was disclosed, when and to whom.`,
  ],
  [
    "privacy",
    "Chính sách quyền riêng tư",
    "Privacy policy",
    `${DRAFT_VI}\n\n## Dữ liệu thu thập\nThông tin tài khoản, hồ sơ công ty, tin đăng, tài liệu riêng tư và tin nhắn với môi giới.\n\n## Mục đích\nVận hành sàn, xem xét tin đăng, môi giới và giới thiệu có kiểm soát, đáp ứng nghĩa vụ pháp lý.\n\n## Chia sẻ\nThông tin nhận dạng chỉ được chia sẻ với bên kia sau khi giới thiệu được phê duyệt, trong phạm vi đã duyệt.`,
    `${DRAFT_EN}\n\n## Data collected\nAccount details, company profiles, listings, private documents and messages with brokers.\n\n## Purposes\nOperating the marketplace, reviewing listings, brokering and controlled introductions, meeting legal obligations.\n\n## Sharing\nIdentifying information is shared with the other party only after an approved introduction, within the approved scope.`,
  ],
  ["seller-guidelines", "Hướng dẫn cho người bán", "Seller guidelines", `${DRAFT_VI}\n\n- Mô tả trung thực cấu hình, tình trạng và lỗi đã biết.\n- Không đưa thông tin liên hệ vào mô tả hoặc ảnh.\n- Che số serial đầy đủ trong ảnh.\n- Có thể trả lời “Không rõ”; câu trả lời này dẫn tới xem xét nội bộ.`, `${DRAFT_EN}\n\n- Describe configuration, condition and known faults honestly.\n- Do not put contact details in descriptions or photos.\n- Mask full serial numbers in photos.\n- You may answer “Unknown”; this leads to internal review.`],
  ["prohibited", "Tin đăng bị cấm & hạn chế", "Prohibited and restricted listings", `${DRAFT_VI}\n\n- Thiết bị không thuộc quyền bán của người đăng.\n- Thiết bị không có mặt tại Việt Nam (ngoài phạm vi MVP).\n- Tin đăng hạn chế: thiết bị cần xem xét kiểm soát xuất khẩu theo từng trường hợp.`, `${DRAFT_EN}\n\n- Equipment the lister has no authority to sell.\n- Equipment not located in Vietnam (outside MVP scope).\n- Restricted: equipment requiring case-by-case export-control review.`],
  ["complaints", "Khiếu nại & giải quyết tranh chấp", "Complaints and dispute process", `${DRAFT_VI}\n\n1. Gửi khiếu nại qua trang Liên hệ.\n2. Đội ngũ vận hành xác nhận và xem xét.\n3. Tranh chấp giữa các bên về giao dịch được giải quyết theo hợp đồng giữa họ.`, `${DRAFT_EN}\n\n1. Submit a complaint via the Contact page.\n2. The operations team acknowledges and reviews it.\n3. Disputes between the parties about a transaction are resolved under their own contract.`],
  ["cookies", "Thông báo cookie", "Cookie notice", `${DRAFT_VI}\n\nTrang web chỉ dùng cookie cần thiết: cookie phiên đăng nhập (gs_session) và cookie ngôn ngữ (locale). Không dùng cookie quảng cáo hay phân tích.`, `${DRAFT_EN}\n\nThis site uses only strictly necessary cookies: the sign-in session cookie (gs_session) and the language cookie (locale). No advertising or analytics cookies are used.`],
  [
    "brokerage-terms",
    "Điều khoản đăng tin & môi giới (người bán)",
    "Listing & brokerage terms (seller)",
    `${DRAFT_VI}\n\n## Phí\n- Phí đăng tin: tương đương US$100 cho mỗi tin đăng mỗi tháng. Tiền tệ thanh toán và cơ sở quy đổi ghi theo hoá đơn.\n- Hoa hồng thành công tiêu chuẩn: 5% giá bán khi giao dịch đủ điều kiện, trừ khi có thoả thuận riêng được chấp nhận.\n\n## Thời điểm phát sinh\nTheo điều kiện ghi trong thoả thuận (ví dụ: khi ký hợp đồng mua bán).\n\n## Lưu ý\n- Không có điều khoản phạt tự động.\n- Hiệu lực của điều khoản chống lách (anti-circumvention) cần luật sư xem xét.\n- Biện pháp kiểm soát của nền tảng không bảo đảm thanh toán.`,
    `${DRAFT_EN}\n\n## Fees\n- Listing fee: US$100 equivalent per listing per month. Billing currency and FX basis recorded per invoice.\n- Standard success commission: 5% of the sale price on a qualifying sale, unless an individually negotiated rate is accepted.\n\n## Trigger\nAs stated in the agreement (for example, when the sale agreement is signed).\n\n## Notes\n- No automatic penalties.\n- Enforceability of any anti-circumvention clause requires legal review.\n- Platform controls do not guarantee payment.`,
  ],
  [
    "buyer-intro-terms",
    "Điều khoản giới thiệu người mua",
    "Buyer introduction terms",
    `${DRAFT_VI}\n\n- Bạn gửi yêu cầu tới môi giới; danh tính của bạn được bảo mật với người bán cho tới khi được giới thiệu.\n- Môi giới có thể xác minh công ty của bạn trước khi tiến hành.\n- Thông tin chỉ được tiết lộ trong phạm vi đã được phê duyệt cho từng lần giới thiệu.`,
    `${DRAFT_EN}\n\n- You send enquiries to the broker; your identity is kept confidential from the seller until an introduction.\n- The broker may verify your company before proceeding.\n- Information is disclosed only within the scope approved for each introduction.`,
  ],
];

export async function seedReference(prisma: PrismaClient) {
  for (const [i, [slug, nameVi, nameEn]] of CATEGORIES.entries()) {
    await prisma.category.upsert({ where: { slug }, create: { slug, nameVi, nameEn, sortOrder: i }, update: {} });
  }
  for (const [i, [name, manufacturer, memoryGb, exportReviewFlag]] of GPU_MODELS.entries()) {
    await prisma.gpuModel.upsert({ where: { name }, create: { name, manufacturer, memoryGb, exportReviewFlag, sortOrder: i }, update: {} });
  }
  for (const [i, [code, nameVi, nameEn]] of LOCATIONS.entries()) {
    await prisma.location.upsert({ where: { code }, create: { code, nameVi, nameEn, sortOrder: i }, update: {} });
  }
  for (const [i, [checkType, nameVi, nameEn, meaningVi, meaningEn]] of BADGES.entries()) {
    await prisma.badgeDefinition.upsert({
      where: { checkType },
      create: { checkType, nameVi, nameEn, meaningVi, meaningEn, notMeaningVi: NOT_GOV.vi, notMeaningEn: NOT_GOV.en, sortOrder: i },
      update: {},
    });
  }
  for (const [i, [key, nameVi, nameEn, descriptionVi, descriptionEn, status, isFuture]] of SERVICES.entries()) {
    await prisma.service.upsert({ where: { key }, create: { key, nameVi, nameEn, descriptionVi, descriptionEn, status, isFuture, sortOrder: i }, update: {} });
  }
  for (const [slug, titleVi, titleEn, bodyVi, bodyEn] of PAGES) {
    await prisma.contentPage.upsert({ where: { slug }, create: { slug, titleVi, titleEn, bodyVi, bodyEn, isLegalDraft: true }, update: {} });
  }
}
