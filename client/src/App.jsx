import { BrowserRouter, Routes, Route, Outlet, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import BingoGrid from "./components/BingoGrid"
import { ThemeProvider } from "./components/theme-provider"
import { ModeToggle } from "./components/mode-toggle";
function Header() {
  const navigate = useNavigate()
  return (
    <div className="flex items-center w-full justify-center">
      <h1 className="text-5xl font-bold text-primary mb-2">BINGO</h1>
      <div className="absolute right-4">
        <ModeToggle />
      </div>
    </div>
  )
}

function Layout() {
  return (
    <>      
    <header className="p-4 border-b flex justify-end">
      <Header />
    </header>
      <Outlet />
    </>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<BingoGrid />} />
            <Route path="bingo" element={<BingoGrid />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
