document.addEventListener('DOMContentLoaded', function() {
    loadPlaylistFromLocalStorage();
});

document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const contents = e.target.result;
            parseM3U(contents);
            savePlaylistToLocalStorage(contents);
        };
        reader.readAsText(file);
    }
});

function parseM3U(contents) {
    const lines = contents.split('\n');
    const playlist = document.getElementById('playlist');
    playlist.innerHTML = '';
    let currentChannel = {};

    lines.forEach(line => {
        if (line.startsWith('#EXTINF')) {
            const channelInfo = line.split(',')[1];
            currentChannel = { name: channelInfo };
        } else if (line && !line.startsWith('#')) {
            currentChannel.url = line;
            addChannelToPlaylist(currentChannel);
            currentChannel = {};
        }
    });
}

function addChannelToPlaylist(channel) {
    const listItem = document.createElement('li');
    const videoElement = document.createElement('video');
    const channelName = document.createElement('p');

    channelName.textContent = channel.name;
    videoElement.src = channel.url;
    videoElement.controls = true;
    videoElement.width = 600;

    listItem.appendChild(channelName);
    listItem.appendChild(videoElement);
    document.getElementById('playlist').appendChild(listItem);
}

function savePlaylistToLocalStorage(contents) {
    localStorage.setItem('m3uPlaylist', contents);
}

function loadPlaylistFromLocalStorage() {
    const contents = localStorage.getItem('m3uPlaylist');
    if (contents) {
        parseM3U(contents);
    }
}