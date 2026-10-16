// Identitas perusahaan yang dicetak di kop surat jalan. Sesuaikan dengan data klien.
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Lentera Distribusi',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Alamat perusahaan',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '-',
};
