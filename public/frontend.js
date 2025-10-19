const URLparams = new URLSearchParams(window.location.search)
const state = URLparams.get('state')
console.log(window.location.search)

const ul = document.querySelector("#playlists")

async function loadPlaylists(){

const response = await fetch(`/api/playlists?state=${state}`)
const playlists = await response.json()

playlists.forEach(playlist =>{
    const images = document.createElement("img")
    const li = document.createElement("li")
    li.className = "flex flex-col items-center"
    const ratePlaylistBtn = document.createElement("button")
    ratePlaylistBtn.style.cursor = "pointer"
    ratePlaylistBtn.textContent = "Start rating!"
    ratePlaylistBtn.className = "bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md transition";

    const link = document.createElement("a")
    link.href = `rating.html?playlistId=${playlist.id}&state=${state}`
    images.src = playlist.image
    images.width = 200
    images.height = 200
    images.className = "rounded-lg mb-2"

    ratePlaylistBtn.addEventListener('click', async () => {

        try{
            const trackResponses = await fetch(`/api/tracks?playlistId=${playlist.id}&state=${state}`)
            const trackNames = await trackResponses.json()
            window.location.href = `rating.html?playlistId=${playlist.id}&state=${state}`
        }
        catch(err){
            console.error("Failed to fetch tracks", err)
        }
    })
    li.appendChild(images)
    li.appendChild(ratePlaylistBtn)
    ul.appendChild(li)
})
}
loadPlaylists()

