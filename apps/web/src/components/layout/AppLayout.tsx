import type { JSX } from "solid-js"
import { Header } from "./Header"
import { ToastContainer } from "@/components/ui"
import "./AppLayout.css"

interface AppLayoutProps {
  children?: JSX.Element
}

export function AppLayout(props: AppLayoutProps) {
  return (
    <div class="app-layout">
      <Header />
      <main class="app-layout__main">{props.children}</main>
      <ToastContainer />
    </div>
  )
}
