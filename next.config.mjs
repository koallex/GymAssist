/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Статический экспорт не нужен: App Router + client storage.
  // Vercel подхватывает Next.js автоматически.
};

export default nextConfig;
