//Setup the connection and will cause the server's connection event handler to run
const socket = io();

//Elements
const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormBtn = $messageForm.querySelector('button');
const $sendLocationBtn = document.querySelector('#send-location');
const $sidebarElement = document.querySelector('#sidebar');

//Select the element to which you want to render the template
const $messages = document.querySelector('#messages');

//Select the template
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

//Query String
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true});

//Autoscroll
const autoScroll = () => {
    //New message element
    $newMessage = $messages.lastElementChild;

    //Height of the new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    //Visible height
    const visibleHeight = $messages.offsetHeight;

    //Height of the message container
    const containerHeight = $messages.scrollHeight;

    //How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight;

    //check for user at bottom of the scroll before new message is added
    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight;
    }
};

//Emit join message with username and room to server
socket.emit('join', {username, room}, (error) => {
    if (error) {
        alert(error); // can use bootstrap modal later
        location.href = '/';
    }
});

//Emit message to server
$messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const message = $messageFormInput.value;
    $messageFormBtn.setAttribute('disabled', 'disabled');

    socket.emit('sendMessage', message, (error) => {
        $messageFormInput.value = '';
        $messageFormInput.focus();
        $messageFormBtn.removeAttribute('disabled');

        if (error) {
            return console.log(error);
        }

        console.log('Message delivered!');
    });
});

//Emit location info to server
$sendLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser!');
    }
    $sendLocationBtn.setAttribute('disabled', 'disabled');
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {latitude: position.coords.latitude, longitude: position.coords.longitude}, () => {
            $sendLocationBtn.removeAttribute('disabled');
            console.log('Location shared!');
        });
    });
});

//Listen to the server sent events for message
socket.on('message', (message) => {
    //Render the template with the message
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a'),
    });

    //Insert the template into the DOM at last
    $messages.insertAdjacentHTML('beforeend', html);

    //detect the position and scroll
    autoScroll();
});

//Listen to the server sent events for shared location
socket.on('locationMessage', (location) => {
    //Render the template with the location
    const html = Mustache.render(locationTemplate, {
        username: location.username,
        locationURL: location.locationURL,
        createdAt: moment(location.createdAt).format('h:mm a'),
    });

    //Insert the location template into the DOM at last
    $messages.insertAdjacentHTML('beforeend', html);
});

//Listen to the server sent room data for a joined room
socket.on('roomData', ({room, users}) => {
    //Render the template with the room and users
    const html = Mustache.render(sidebarTemplate, {room, users});

    //Insert the sidebar template into the DOM
    $sidebarElement.innerHTML = html;
});
