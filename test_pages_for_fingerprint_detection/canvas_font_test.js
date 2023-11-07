function canvas_font() {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = "16px 'Arial'";
    let text = ctx.measureText("Hello world");
    console.log(text.width); // 56;

    var strng = canvas.toDataURL();

    document.body.appendChild(canvas);

    var hash = 0;
    if (strng.length == 0) return 'nothing!';
    for (i = 0; i < strng.length; i++) {
        char = strng.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

canvas_font();