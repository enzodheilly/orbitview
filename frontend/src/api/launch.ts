import type { Launch } from "../types/launch";

// On utilise la même base que pour les satellites pour profiter du proxy Vite
const BASE = '/api'; 

export async function getUpcomingLaunches(): Promise<Launch[]> {
    // Utilise l'URL relative au lieu de localhost:8000
    const res = await fetch(`${BASE}/launches`); 
    
    if (!res.ok) {
        throw new Error(`Erreur lors de la récupération des lancements: ${res.status}`);
    }

    return res.json();
}