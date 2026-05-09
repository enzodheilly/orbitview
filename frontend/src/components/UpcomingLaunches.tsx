import { useEffect, useState } from "react";
import { getUpcomingLaunches } from "../api/launch";
import type { Launch } from "../types/launch";

export default function UpcomingLaunches() {
    const [launches, setLaunches] = useState<Launch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUpcomingLaunches()
            .then(setLaunches)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p>Chargement des lancements…</p>;

    return (
        <div style={{ padding: "20px" }}>
            <h2>🚀 Prochains lancements</h2>

            {launches.length === 0 && <p>Aucun lancement trouvé.</p>}

            <ul>
                {launches.map((launch, i) => (
                    <li key={i} style={{ marginBottom: "15px" }}>
                        <strong>{launch.mission_name}</strong><br />
                        Fournisseur : {launch.provider}<br />
                        Date : {new Date(launch.date).toLocaleString()}<br />
                        Fusée : {launch.rocket ?? "?"}<br />
                        Lieu : {launch.pad ?? "?"}
                    </li>
                ))}
            </ul>
        </div>
    );
}