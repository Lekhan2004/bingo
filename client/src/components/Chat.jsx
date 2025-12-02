import { useSocket } from "../context/socketContext";
import React, { useState, useEffect, use } from "react";
import { io } from "socket.io-client";

export default function Chat() {

    const {socket, connected} = useSocket();

    console.log("Chat component socket:", socket);
    const [connectedState, setConnectedState] = useState(connected);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {

        const handleConnect = () => {
            console.log("connected to server");
            setConnectedState(true);
            setConnecting(false);
        };
        
        const handleDisconnect = () => {
            console.log("disconnected from server");
            setConnectedState(false);
            setConnecting(false);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
        };

    }, [socket]);

    const connect = () => {
        if (!socket || connectedState || connecting) return;
        setConnecting(true);
        socket.connect();
    }

    const disconnect = () => {
        if (!socket || !connectedState) return;
        setConnecting(false);
        socket.disconnect();
    }

    return (
        <div style={{ display: "inline-block", padding: 12, border: "1px solid #ddd", borderRadius: 6 }}>
            <div style={{ marginBottom: 8 }}>
                Status:&nbsp;
                <strong>
                    {connecting ? "Connecting..." : connectedState ? "Connected" : "Disconnected"}
                </strong>
            </div>
            <button onClick={connect} style={{ marginRight: 8 }}>
                Connect
            </button>
            <button onClick={disconnect}>
                Disconnect
            </button>
        </div>
    );
}