const URLparams = new URLSearchParams(window.location.search)
const state = URLparams.get('state')
const playlistId = URLparams.get("playlistId")
let tracksArray = []
let ratings = []
let currentIndex = 0
let ul = document.querySelector("#tracks")
let finishedText = document.querySelector("#all-done")

async function loadTracks(){
    let trackData = await fetch(`/api/tracks?playlistId=${playlistId}&state=${state}`)
    let parsedTrackData = await trackData.json()

    tracksArray = parsedTrackData
    console.log(parsedTrackData)
    displayTracks(0)
}
loadTracks()

async function displayTracks(index){
    currentTrack = tracksArray[index]
    
    if(index >= tracksArray.length){
        finishedText.textContent = "Rating is finished! Your spotify playlist will be rearranged momentarily"
        await sendRatingstoBackend()
        return 
    }
    const trackCard = document.createElement("div")
    trackCard.className = "p-[8px] rounded-md bg-[#1f1e1e] w-[400px] h-[270px] flex flex-col justify-center items-center"
    
  const title = document.createElement("h2");
  title.id = "title";
  title.className = "text-white text-center text-[24px]";
  title.textContent = `${currentTrack.name} - ${currentTrack.artists}`

    const audioContainer = document.createElement("div");
  audioContainer.className = "flex items-center justify-center mt-6 w-full px-4";
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = currentTrack.previewUrls[0];
  audio.className = "w-full";
  audioContainer.appendChild(audio);

    const inputContainer = document.createElement("div");
  inputContainer.className = "flex items-center justify-center mt-5";
  const input = document.createElement("input");
  input.type = "number";
  input.placeholder = "rate song 1-10...";
  input.className = "bg-white w-[350px] h-[33px] placeholder:text-center rounded-[6px] focus:outline-none focus:ring-2 focus:ring-green-500 p-1 text-center";
  inputContainer.appendChild(input);

    const buttonContainer = document.createElement("div");
  buttonContainer.className = "flex items-center justify-center mt-5";
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next song!";
  nextBtn.className = "text-white w-[350px] h-[33px] bg-green-500 hover:bg-green-600 transition rounded-[6px] font-medium shadow-sm";
  buttonContainer.appendChild(nextBtn);


    nextBtn.addEventListener("click", () => {
        const ratingValue = Number(input.value.trim())
        ul.innerHTML = ""

        if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 10) {
  alert("Please enter a valid number between 1–10!")
  return
}

        currentTrack.rating = ratingValue
        ratings.push({
             uri: currentTrack.uri,
    rating: ratingValue,
    playlistId: currentTrack.playlistId
        })

        console.log(ratings)
        displayTracks(index + 1)
    })
    trackCard.append(title, audioContainer, inputContainer, buttonContainer)
    ul.append(trackCard)
}

async function sendRatingstoBackend(){
    await fetch(`/api/submit-ratings?state=${state}`, {
        method: "POST",
        headers: {'Content-type': "application/json"},
        body: JSON.stringify({playlistId, ratings})
    })
}