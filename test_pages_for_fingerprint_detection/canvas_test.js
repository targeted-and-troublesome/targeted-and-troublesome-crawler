function canvas_fp() {
    const ua = navigator.userAgent;  // to test the instrumentation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const txt = 'i9asdm..$#po((^@KbXrww!~cz';
    ctx.textBaseline = "top";
    ctx.font = "16px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.rotate(.05);
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText(txt, 4, 17);
    ctx.strokeStyle = "#FF0000";
    ctx.strokeText("Hello world", 50, 90);
    ctx.shadowBlur = 10;
    ctx.shadowColor = "blue";
    ctx.fillRect(-20, 10, 234, 5);
    ctx.save();
    ctx.restore();
    ctx.canvas.addEventListener("click", function () {
        console.log("canvas clicked");
    });
    const canvasImgAsText = canvas.toDataURL("image/png");
    console.log(canvasImgAsText);
    document.body.appendChild(canvas);
}

canvas_fp();