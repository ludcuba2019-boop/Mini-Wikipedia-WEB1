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

    try {
        let url = `https://es.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=false&explaintext=true&titles=${encodeURIComponent(tema)}&origin=*`;
        let res = await fetch(url);
        let data = await res.json();
        const pages = data.query.pages;
        const page = Object.values(pages)[0];

        document.getElementById("wiki-title").textContent = page.title || tema;
        document.getElementById("wiki-desc").textContent = page.extract || "No se encontró información.";
        document.getElementById("wiki-link").href = `https://es.wikipedia.org/wiki/${encodeURIComponent(page.title)}`;

        url = `https://es.wikipedia.org/w/api.php?action=query&format=json&prop=images&pageids=${page.pageid}&origin=*`;
        res = await fetch(url);
        data = await res.json();
        const images = data.query.pages[page.pageid].images || [];

        const imagenesContainer = document.querySelector(".seleccion-grid .imagen");
        imagenesContainer.innerHTML = ""; 
        let count = 0;

        for (let img of images) {
            if (count >= 3) break;
            const title = img.title;

            if (!/\.(jpg|jpeg|png|gif|svg)$/i.test(title)) continue;

            const imgUrlRes = await fetch(`https://es.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&origin=*`);
            const imgData = await imgUrlRes.json();
            const imgPage = Object.values(imgData.query.pages)[0];
            if (imgPage.imageinfo && imgPage.imageinfo[0] && imgPage.imageinfo[0].url) {
                const imgEl = document.createElement("img");
                imgEl.src = imgPage.imageinfo[0].url;
                imgEl.style.marginBottom = "10px";
                imgEl.style.width = "100%";
                imgEl.style.borderRadius = "10px";
                imgEl.style.border = "5px solid transparent";
                imgEl.style.padding = "5px";
                imagenesContainer.appendChild(imgEl);
                count++;
            }
        }

    } catch (error) {
        document.getElementById("wiki-title").textContent = tema;
        document.getElementById("wiki-desc").textContent = "No se pudo cargar información.";
        document.getElementById("wiki-link").href = "#";
        document.querySelector(".seleccion-grid .imagen").innerHTML = "";
        console.error("Error al cargar Wikipedia:", error);
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
    btnCerrar.textContent = "Inicio";
    btnCerrar.id = "btn-volver";
    btnCerrar.onclick = () => {
        document.querySelector(".seleccion-contenido").style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
    };
    document.querySelector(".seleccion-contenido").appendChild(btnCerrar);
});
