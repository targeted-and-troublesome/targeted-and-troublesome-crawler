function web_rtc() {
  var PeerConnection =
    window.RTCPeerConnection ||
    window.mozRTCPeerConnection ||
    window.webkitRTCPeerConnection;
  var connection = new PeerConnection(
    {
      iceServers: [],
    },
    {
      optional: [
        {
          RtpDataChannels: !0,
        },
      ],
    }
  );
  connection.onicecandidate = function(e) {
    connection.candidate && h(e.candidate.candidate)
}
connection.createDataChannel("test");
  try {
    connection.createOffer().then(function(e) {
      connection.setLocalDescription(e)
    })
} catch (e) {
  connection.createOffer(function(e) {
    connection.setLocalDescription(e, function() {}, function() {})
    }, function() {})
}
var d = "\n";
setTimeout(function() {
  connection.localDescription.sdp.split(d).forEach(function(e) {
        0 === e.indexOf("a=candidate:")
    })
}, 100)
}

web_rtc();
