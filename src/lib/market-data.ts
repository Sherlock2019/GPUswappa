/**
 * New data-centre GPU market reference data.
 *
 * SOURCE: the operator's internal research book "Australia-Based NVIDIA H100/H200 Reseller for
 * Vietnam & ASEAN" (Nov 2026), which cites the public sources listed below. Figures are
 * INDICATIVE PLANNING RANGES, not quotations, and were not independently verified by the
 * platform. Prices change quickly; administrators should review this file before launch.
 * Supply channels are described by type only — no third-party business is presented as a partner.
 */

export const MARKET_DATA_AS_OF = "2026-11";

export type PriceRow = {
  product: string;
  memory: string;
  gpuPrice: string; // per GPU, USD
  serverPrice: string; // 8-GPU server, USD
  cloudPrice: string; // per GPU-hour, USD
  noteKey: "h100" | "h200" | "mi300x" | "mi325x";
};

export const NEW_GPU_PRICES: PriceRow[] = [
  { product: "NVIDIA H100", memory: "80 GB HBM3", gpuPrice: "US$25,000–40,000", serverPrice: "US$250,000–400,000", cloudPrice: "US$2.89–6.98", noteKey: "h100" },
  { product: "NVIDIA H200", memory: "141 GB HBM3e", gpuPrice: "US$30,000–40,000", serverPrice: "US$300,000–500,000+", cloudPrice: "US$3.35–7.91", noteKey: "h200" },
  { product: "AMD Instinct MI300X", memory: "192 GB HBM3", gpuPrice: "US$25,000–32,000", serverPrice: "≈US$234,000–450,000", cloudPrice: "US$1.91–2.59", noteKey: "mi300x" },
  { product: "AMD Instinct MI325X", memory: "256 GB HBM3E", gpuPrice: "US$28,000–35,000", serverPrice: "≈US$244,000–550,000+", cloudPrice: "US$2.88–3.80", noteKey: "mi325x" },
];

/** Landed-cost buffer suggested by the research for Vietnam (freight, duty, VAT, integration, warranty reserve, compliance). */
export const LANDED_COST_BUFFER = "15–35%";

export type Source = { label: string; url: string };

export const MARKET_SOURCES: Source[] = [
  { label: "Circular 63/2026/TT-BKHCN (LuatVietnam, English)", url: "https://english.luatvietnam.vn/circular-no-63-2026-tt-bkhcn-dated-october-27-2026-of-the-ministry-of-science-and-technology-announcing-the-detailed-list-of-used-digital-technology-453291-doc1.html" },
  { label: "LuatVietnam — used digital-technology products prohibited from import from 1 Jan 2027", url: "https://english.luatvietnam.vn/legal-updates/list-of-used-digital-technology-products-prohibited-from-importation-effective-january-1-2027-892-114756-article.html" },
  { label: "U.S. BIS guidance on advanced computing (May 2026)", url: "https://www.bis.gov/media/documents/bis-guidance-may-31-2026.pdf" },
  { label: "U.S. BIS — re-exports and transfers of items subject to the EAR", url: "https://www.bis.gov/learn-support/guidance-reexports-exports-abroad-transfers-country-u.s.-origin-items-or-foreign-made-items-subject-ear" },
  { label: "15 CFR Part 740, Supplement No. 1 (Country Groups)", url: "https://www.ecfr.gov/current/title-15/part-740" },
  { label: "AMD Instinct MI300X specifications", url: "https://www.amd.com/en/products/accelerators/instinct/mi300.html" },
  { label: "AMD Instinct MI325X specifications", url: "https://www.amd.com/en/products/accelerators/instinct/mi300/mi325x.html" },
  { label: "GPU purchase price guide (gpusmith.com)", url: "https://gpusmith.com/articles/en/nvidia-data-center-gpu-pricing-guide" },
  { label: "GPU purchase price index (gpurentalprices.com)", url: "https://gpurentalprices.com/buy" },
  { label: "Cloud GPU pricing comparison (cloudrift.ai)", url: "https://www.cloudrift.ai/cloud-gpu-pricing-comparison" },
];
