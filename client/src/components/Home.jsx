import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();

    const games = [
        { name: 'Bingo', path: '/bingo' },
        { name: 'Poker', path: '/poker' },
        { name: 'Chess', path: '/chess' },
        { name: 'Trivia', path: '/trivia' },
    ];

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h1>Welcome to the Multiplayer Platform</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                {games.map((game) => (
                    <div
                        key={game.name}
                        onClick={() => navigate(game.path)}
                        style={{
                            width: '200px',
                            height: '150px',
                            border: '1px solid #ccc',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            backgroundColor: '#f9f9f9',
                            transition: 'background-color 0.3s',
                        }}
                        onMouseEnter={(e) => (e.target.style.backgroundColor = '#e0e0e0')}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = '#f9f9f9')}
                    >
                        <h2>{game.name}</h2>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Home;