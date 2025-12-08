/* Temas buscados */
const wikiTopics = {
    deportes: "Deporte",
    historia: "Historia",
    ciencia: "Ciencia",
    entretenimiento: "Entretenimiento",
    arte: "Arte"
};

/* Funcionmes*/
async function cargarWikipedia(seccion) {
    const tema = wikiTopics[seccion];
    const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(tema)}`;

    try {
        const res = await fetch(url);
        const info = await res.json();

        document.getElementById("wiki-title").textContent = info.title || tema;
        document.getElementById("wiki-desc").textContent = info.extract || "No se encontró información.";
        document.getElementById("wiki-extra").textContent = info.description || "Sin datos adicionales.";

        if (info.thumbnail) {
            document.querySelector(".seleccion-grid .imagen img").src = info.thumbnail.source;
        }

        document.getElementById("wiki-link").href = info.content_urls.desktop.page;

    } catch (error) {
        document.getElementById("wiki-title").textContent = tema;
        document.getElementById("wiki-desc").textContent = "No se pudo cargar información.";
    }
}

function mostrarSeccion(seccion) {
    document.querySelector(".seleccion-contenido").style.display = "block";
    cargarWikipedia(seccion);
    document.querySelector(".seleccion-contenido").scrollIntoView({ behavior: "smooth" });
}

/* Eventos*/
document.addEventListener("DOMContentLoaded", () => {
    
    document.querySelector(".deportes button").addEventListener("click", () => mostrarSeccion("deportes"));
    document.querySelector(".historia button").addEventListener("click", () => mostrarSeccion("historia"));
    document.querySelector(".ciencia button").addEventListener("click", () => mostrarSeccion("ciencia"));

    document.querySelectorAll(".card-reco").forEach(card => {
        const titulo = card.querySelector("h3").textContent.toLowerCase();
        card.querySelector("button").addEventListener("click", () => {
            if (titulo === "entretenimiento") mostrarSeccion("entretenimiento");
            if (titulo === "arte") mostrarSeccion("arte");
        });
    });

    /* Volver */
    const btnCerrar = document.createElement("button");
    btnCerrar.textContent = "Volver atrás";
    btnCerrar.id = "btn-volver";
    btnCerrar.onclick = () => {
        document.querySelector(".seleccion-contenido").style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    document.querySelector(".seleccion-contenido").appendChild(btnCerrar);
});
