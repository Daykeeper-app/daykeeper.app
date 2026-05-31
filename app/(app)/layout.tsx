import SidebarNav from "@/components/Navbar/SidebarNav"
import MobileNav from "@/components/Navbar/MobileNav"
import RightPanel from "@/components/Feed/RightPanel"
import { AuthProvider } from "@/components/Auth/AuthProvider"
import TutorialGate from "@/components/common/TutorialGate"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-dk-paper text-dk-ink">
        <RightPanel />
        <SidebarNav />

        <div className="lg:ml-64 xl:ml-72 lg:mr-80 pb-20 lg:pb-0 bg-(--dk-paper)">
          {children}
        </div>

        <MobileNav />
        <TutorialGate />
      </div>
    </AuthProvider>
  )
}
