import { BrowserRouter, Routes, Route, Outlet, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import BingoGrid from "./components/BingoGrid"
import { ThemeProvider } from "./components/theme-provider"
import { ModeToggle } from "./components/mode-toggle";
import { io } from "socket.io-client";
import { useEffect } from "react";
import Chat from "./components/Chat";
import { useState } from "react";
import Home from "./components/Home";
import { SocketProvider } from "./context/socketContext";

function Header() {
  const navigate = useNavigate()
  return (
    <div className="flex items-center w-full justify-center">
      <h1 className="text-5xl font-bold text-primary mb-2">Gamy Bitches</h1>
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

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:3000", {
        autoConnect: false
    });
    console.log("Created socket:", newSocket);
    setSocket(newSocket);
  }, []);


  return (
    <SocketProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="bingo" element={<BingoGrid socket={socket} />} />
              <Route path="chat" element={ socket && <Chat socket={socket} />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </SocketProvider>
  )
}

export default App
