function botSpeak(text) {
  if ('speechSynthesis' in window) {
    var msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
  }
}
$('#webyuyin1').click(function() {
  var recognition = new webkitSpeechRecognition();
  recognition.onresult = function(event) {
  //  userSend(event.results[0][0].transcript);
  };
  recognition.start();
});