export const metadata = {
  title: '域名批量检测工具 - 快速检测HTTP状态',
  description: '批量检测域名HTTP状态、识别可用域名、自动过滤重定向',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
