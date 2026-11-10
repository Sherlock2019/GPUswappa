/**
 * Freely-licensed illustrative photographs (Wikimedia Commons). Each photo is shown
 * with its attribution. They are illustrative only: they do not depict listed units,
 * and the presence of a manufacturer's product does not imply any partnership or
 * endorsement. No freely-licensed photo of an H200 was available at build time, so
 * H100 (same Hopper generation) photos are used and captioned accurately as H100.
 */
export type Photo = {
  src: string;
  altVi: string;
  altEn: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
};

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`;

export const PHOTOS = {
  h100Lineup: {
    src: "/images/photos/h100-pcie-lineup.jpg",
    altVi: "Bốn card GPU NVIDIA H100 PCIe xếp hàng trên mặt bàn đá",
    altEn: "Four NVIDIA H100 PCIe GPU cards lined up on a marble surface",
    author: "极客湾 Geekerwan",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
    sourceUrl: commons("NVIDIA H100 (极客湾Geekerwan) 011.png"),
  },
  h100Standing: {
    src: "/images/photos/h100-pcie-standing.jpg",
    altVi: "Bốn card GPU NVIDIA H100 PCIe đặt đứng",
    altEn: "Four NVIDIA H100 PCIe GPU cards standing upright",
    author: "极客湾 Geekerwan",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
    sourceUrl: commons("NVIDIA H100 (极客湾Geekerwan) 025.png"),
  },
  dcRacks: {
    src: "/images/photos/datacenter-racks.jpg",
    altVi: "Dãy tủ rack máy chủ trong trung tâm dữ liệu",
    altEn: "Rows of server racks in a data centre",
    author: "Carl Lender",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    sourceUrl: commons("Datacenter Server Racks (22370909788).jpg"),
  },
  dcServerRoom: {
    src: "/images/photos/datacenter-server-room.jpg",
    altVi: "Phòng máy chủ với các tủ rack",
    altEn: "Server room with racks",
    author: "Carl Lender",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    sourceUrl: commons("Server Room (22397102849).jpg"),
  },
  dcCern: {
    src: "/images/photos/datacenter-cern.jpg",
    altVi: "Hành lang trung tâm dữ liệu với các tủ máy chủ",
    altEn: "Data-centre aisle lined with server cabinets",
    author: "Hugovanmeijeren",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    sourceUrl: commons("Cern datacenter.jpg"),
  },
  dcRackRear: {
    src: "/images/photos/datacenter-rack-rear.jpg",
    altVi: "Mặt sau tủ rack với cáp mạng và cáp nguồn",
    altEn: "Rear of a rack with network and power cabling",
    author: "Derrick Coetzee",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceUrl: commons("Rear of rack at NERSC data center - closeup.jpg"),
  },
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;
