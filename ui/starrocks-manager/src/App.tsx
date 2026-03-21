/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ReactNode, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Settings, 
  Eye, 
  Search, 
  RefreshCw, 
  Terminal, 
  ArrowUpCircle, 
  Box, 
  GitBranch, 
  CheckCircle2, 
  Sun, 
  Moon, 
  Monitor, 
  LogOut,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { motion } from 'motion/react';

const COLORS = {
  primary: '#1890FF',
  success: '#52C41A',
  danger: '#FF4D4F',
  neutralGray: '#FCF2F5',
  neutralDark: '#262626',
  white: '#FFFFFF',
  border: '#F0F2F5',
  textSecondary: '#8C8C8C',
  sidebarBg: '#F5F7FA',
  activeNav: '#E6F7FF',
};

const NavItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <div className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${active ? 'bg-[#E6F7FF] text-[#1890FF] border-r-2 border-[#1890FF]' : 'text-[#595959] hover:bg-gray-100'}`}>
    <Icon size={18} />
    <span className="text-[14px] font-medium">{label}</span>
  </div>
);

const Card = ({ title, children, className = "" }: { title: string, children: ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg border border-[#F0F2F5] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${className}`}>
    <h3 className="text-[16px] font-medium mb-6 text-[#262626]">{title}</h3>
    {children}
  </div>
);

const ColorBox = ({ name, hex, rgb, hover, border, bg }: { name: string, hex: string, rgb: string, hover: string, border: string, bg: string }) => (
  <div className="flex flex-col gap-2">
    <div 
      className="w-full h-24 rounded-lg flex flex-col justify-end p-3 text-white" 
      style={{ backgroundColor: bg, border: `1px solid ${border}` }}
    >
      <span className="text-[14px] font-medium">{name}</span>
      <div className="text-[12px] opacity-90 mt-1">
        <div>HEX: {hex}</div>
        <div>RGB: {rgb}</div>
        <div>Hover: {hover}</div>
        <div>Border: {border}</div>
      </div>
    </div>
  </div>
);

const StatusPill = ({ label, type }: { label: string, type: 'active' | 'inactive' | 'success' | 'leader' | 'prime' }) => {
  const styles = {
    active: 'bg-[#F6FFED] text-[#52C41A] border-[#B7EB8F]',
    inactive: 'bg-[#F5F5F5] text-[#8C8C8C] border-[#D9D9D9]',
    success: 'bg-[#F6FFED] text-[#52C41A] border-[#B7EB8F]',
    leader: 'bg-[#E6F7FF] text-[#1890FF] border-[#91D5FF]',
    prime: 'bg-[#F5F5F5] text-[#8C8C8C] border-[#D9D9D9]',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-[12px] flex items-center gap-1.5 whitespace-nowrap ${styles[type]}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${type === 'active' || type === 'success' ? 'bg-[#52C41A]' : type === 'leader' ? 'bg-[#1890FF]' : 'bg-[#8C8C8C]'}`} />
      {label}
    </span>
  );
};

export default function App() {
  const [activeTheme, setActiveTheme] = useState<'sun' | 'moon' | 'monitor'>('sun');

  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#F5F7FA] border-r border-[#D9D9D9] flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141433] rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
            N
          </div>
          <div>
            <h1 className="text-[16px] font-bold text-[#262626]">StarRocks Manager</h1>
            <p className="text-[10px] text-[#8C8C8C]">数据库管理工具</p>
          </div>
        </div>

        <nav className="flex-1 mt-4 overflow-y-auto">
          <div className="px-4 mb-2 text-[12px] text-[#8C8C8C] font-medium uppercase tracking-wider">管理</div>
          <NavItem icon={LayoutDashboard} label="Design System" active />
          
          <div className="px-4 mt-6 mb-2 text-[12px] text-[#8C8C8C] font-medium uppercase tracking-wider">数据管理</div>
          <NavItem icon={Database} label="数据库列表" />
          <NavItem icon={Settings} label="Catalog 管理" />
          <NavItem icon={Eye} label="物化视图" />
          <NavItem icon={Terminal} label="SQL 查询" />

          <div className="px-4 mt-6 mb-2 text-[12px] text-[#8C8C8C] font-medium uppercase tracking-wider">导入管理</div>
          <NavItem icon={RefreshCw} label="Routine Load" />
          <NavItem icon={Box} label="Broker Load" />
          <NavItem icon={GitBranch} label="Pipes" />
          <NavItem icon={CheckCircle2} label="任务管理" />
        </nav>

        <div className="p-4 border-t border-[#D9D9D9] bg-[#F5F7FA]">
          <div className="flex justify-center gap-4 mb-4 bg-white rounded-lg p-1 border border-[#D9D9D9]">
            <button onClick={() => setActiveTheme('sun')} className={`p-1.5 rounded transition-all ${activeTheme === 'sun' ? 'bg-[#E6F7FF] text-[#1890FF] shadow-sm' : 'text-[#8C8C8C] hover:text-[#595959]'}`}><Sun size={16} /></button>
            <button onClick={() => setActiveTheme('moon')} className={`p-1.5 rounded transition-all ${activeTheme === 'moon' ? 'bg-[#E6F7FF] text-[#1890FF] shadow-sm' : 'text-[#8C8C8C] hover:text-[#595959]'}`}><Moon size={16} /></button>
            <button onClick={() => setActiveTheme('monitor')} className={`p-1.5 rounded transition-all ${activeTheme === 'monitor' ? 'bg-[#E6F7FF] text-[#1890FF] shadow-sm' : 'text-[#8C8C8C] hover:text-[#595959]'}`}><Monitor size={16} /></button>
          </div>
          <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-[#D9D9D9] shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#52C41A] animate-pulse" />
              <div className="text-[11px]">
                <div className="font-bold text-[#262626]">10.30.16.21:16033</div>
                <div className="text-[#8C8C8C]">root - 8.0.33</div>
              </div>
            </div>
            <LogOut size={14} className="text-[#8C8C8C] cursor-pointer hover:text-[#FF4D4F] transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="mb-10">
          <h2 className="text-[32px] font-bold text-[#262626] tracking-tight">Design System</h2>
          <p className="text-[15px] text-[#8C8C8C] mt-1">StarRocks Manager UI Kit & Style Guide</p>
        </header>

        <div className="grid grid-cols-12 gap-8 max-w-7xl">
          {/* Color Palette */}
          <Card title="Color Palette" className="col-span-12 lg:col-span-7">
            <div className="grid grid-cols-3 gap-4">
              <ColorBox name="Primary Blue" hex="#1890FF" rgb="24, 144, 255" hover="#40A9FF" border="#1890FF" bg="#1890FF" />
              <ColorBox name="Success Green" hex="#52C41A" rgb="82, 198, 26" hover="#73D13D" border="#52C41A" bg="#52C41A" />
              <ColorBox name="Danger Red" hex="#FF4D4F" rgb="255, 77, 79" hover="#FF7875" border="#FF4D4F" bg="#FF4D4F" />
              
              <div className="flex flex-col gap-2">
                <div className="w-full h-24 rounded-lg flex flex-col justify-end p-3 text-[#262626] bg-[#FCF2F5] border border-[#D9D9D9]">
                  <span className="text-[14px] font-medium">Neutral Gray</span>
                  <div className="text-[11px] opacity-90 mt-1 leading-tight">
                    <div>HEX: #FCF2F5</div>
                    <div>RGB: 240, 242, 245</div>
                    <div>Hover: #F5F5F5</div>
                    <div>Border: #D9D9D9</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="w-full h-24 rounded-lg flex flex-col justify-end p-3 text-white bg-[#262626] border border-[#262626]">
                  <span className="text-[14px] font-medium">Neutral Dark</span>
                  <div className="text-[11px] opacity-90 mt-1 leading-tight">
                    <div>HEX: #262626</div>
                    <div>RGB: 38, 38, 38</div>
                    <div>Hover: #434343</div>
                    <div>Border: #262626</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="w-full h-24 rounded-lg flex flex-col justify-end p-3 text-[#262626] bg-white border border-[#F0F2F5]">
                  <span className="text-[14px] font-medium">White</span>
                  <div className="text-[11px] opacity-90 mt-1 leading-tight">
                    <div>HEX: #FFFFFF</div>
                    <div>RGB: 255, 255, 255</div>
                    <div>Border: #F0F2F5</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Typography Hierarchy */}
          <Card title="Typography Hierarchy" className="col-span-12 lg:col-span-5">
            <div className="space-y-8">
              <div>
                <p className="text-[11px] text-[#8C8C8C] mb-3 uppercase font-bold tracking-widest">Font-family</p>
                <p className="text-[14px] text-[#262626] leading-relaxed"><span className="font-semibold">Sans-serif:</span> -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif</p>
                <p className="text-[14px] text-[#262626] mt-2 font-mono leading-relaxed"><span className="font-semibold font-sans">Monospace:</span> SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace</p>
              </div>
              <div>
                <p className="text-[11px] text-[#8C8C8C] mb-3 uppercase font-bold tracking-widest">Headings</p>
                <h1 className="text-[28px] font-bold text-[#262626]">H1: Cluster Overview (28px, Bold)</h1>
                <h2 className="text-[20px] font-medium text-[#262626] mt-3">H2: Frontend 节点 (20px, Medium)</h2>
                <h3 className="text-[16px] font-medium text-[#262626] mt-3">H3: Section Title (16px, Medium)</h3>
              </div>
              <div>
                <p className="text-[11px] text-[#8C8C8C] mb-3 uppercase font-bold tracking-widest">Body</p>
                <p className="text-[14px] text-[#262626]">Body Text (14px, Regular)</p>
                <p className="text-[12px] text-[#262626] mt-2">Small Text (12px, Regular)</p>
                <p className="text-[14px] text-[#262626] mt-2 font-mono">Monospace (14px, Mono)</p>
              </div>
            </div>
          </Card>

          {/* Component Library */}
          <Card title="Component Library" className="col-span-12 lg:col-span-5">
            <div className="space-y-10">
              <div>
                <p className="text-[14px] font-bold mb-4 text-[#262626]">Buttons <span className="text-[12px] font-normal text-[#8C8C8C] ml-2">Border-radius: 4px, Padding: 8px 16px</span></p>
                <div className="flex items-end gap-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-[#8C8C8C] font-medium">Primary</span>
                    <button className="bg-[#1890FF] text-white px-4 py-2 rounded-[4px] text-[14px] font-medium hover:bg-[#40A9FF] transition-all shadow-sm active:scale-95">Refresh</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-[#8C8C8C] font-medium">Ghost</span>
                    <button className="border border-[#D9D9D9] text-[#595959] px-4 py-2 rounded-[4px] text-[14px] font-medium hover:border-[#1890FF] hover:text-[#1890FF] transition-all active:scale-95">Ghost</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-[#8C8C8C] font-medium">Action</span>
                    <button className="text-[#1890FF] text-[14px] font-medium hover:text-[#40A9FF] transition-colors py-2">Action</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-[#8C8C8C] font-medium">Icon-only</span>
                    <button className="border border-[#D9D9D9] p-2 rounded-[4px] text-[#595959] hover:border-[#1890FF] hover:text-[#1890FF] transition-all active:scale-95"><RefreshCw size={16} /></button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[14px] font-bold mb-4 text-[#262626]">Input Fields <span className="text-[12px] font-normal text-[#8C8C8C] ml-2">Border: 1px solid #D9D9D9, Radius: 4px</span></p>
                <div className="relative max-w-sm">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C8C8C]" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-[#D9D9D9] rounded-[4px] focus:outline-none focus:border-[#1890FF] focus:ring-2 focus:ring-[#1890FF]/10 text-[14px] transition-all"
                  />
                </div>
              </div>

              <div>
                <p className="text-[14px] font-bold mb-4 text-[#262626]">Status Indicators (Pills) <span className="text-[12px] font-normal text-[#8C8C8C] ml-2">14px, 4px, padding 4px 8px</span></p>
                <div className="flex flex-wrap gap-4">
                  <StatusPill label="Active" type="active" />
                  <StatusPill label="Inactive" type="inactive" />
                  <StatusPill label="Success" type="success" />
                  <StatusPill label="Leader" type="leader" />
                  <StatusPill label="Prime" type="prime" />
                </div>
              </div>
            </div>
          </Card>

          {/* Table Styles */}
          <Card title="Table Styles" className="col-span-12 lg:col-span-4">
            <p className="text-[11px] text-[#8C8C8C] mb-6 leading-relaxed">Header height: 40px, Row height: 48px, Border: 1px solid #F0F2F5, Padding: 16px 24px</p>
            <div className="border border-[#F0F2F5] rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F7FA] border-b border-[#F0F2F5]">
                    <th className="px-6 py-3 text-[13px] font-semibold text-[#262626]">ID</th>
                    <th className="px-6 py-3 text-[13px] font-semibold text-[#262626]">IP</th>
                    <th className="px-6 py-3 text-[13px] font-semibold text-[#262626]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F2F5]">
                  {[
                    { id: '71901419', ip: '10.88.19.103' },
                    { id: '71967173', ip: '10.88.19.104' },
                    { id: '36942019', ip: '10.88.19.107' },
                    { id: '71883667', ip: '10.88.19.109' },
                    { id: '71883667', ip: '10.88.19.109' },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-[13px] text-[#595959] font-mono">{row.id}</td>
                      <td className="px-6 py-4 text-[13px] text-[#595959] font-mono">{row.ip}</td>
                      <td className="px-6 py-4">
                        <StatusPill label="在线" type="active" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Layout Grid & Spacing */}
          <div className="col-span-12 lg:col-span-3 space-y-8">
            <Card title="Layout Grid & Spacing">
              <div className="flex gap-1 mb-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex-1 h-14 bg-[#E6F7FF] rounded-sm opacity-80" />
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-[#1890FF] rounded-full" />
                  <p className="text-[14px] text-[#262626] font-medium">Spacing-S (8px)</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-[#1890FF] rounded-full" />
                  <p className="text-[14px] text-[#262626] font-medium">Spacing-M (16px)</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-[#1890FF] rounded-full" />
                  <p className="text-[14px] text-[#262626] font-medium">Spacing-L (24px)</p>
                </div>
              </div>
            </Card>

            <Card title="Shadows">
              <div className="p-6 bg-white rounded-lg border border-[#F0F2F5] shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                <p className="text-[13px] text-[#262626] font-medium leading-relaxed">Card Shadow: <br/><span className="text-[#8C8C8C] font-mono text-[11px]">0px 4px 12px rgba(0,0,0,0.08)</span></p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
