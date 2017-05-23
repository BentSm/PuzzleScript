function makeGIF() {
	var randomseed = RandomGen.seed;
	levelEditorOpened=false;
	var targetlevel=curlevel;

	var inputDat = inputHistory.concat([]);

	unitTesting=true;
	levelString=compiledText;



	var encoder = new GIFEncoder();
	encoder.setRepeat(0); //auto-loop
	encoder.setDelay(200);
	encoder.start();

	compile(["loadLevel",curlevel],levelString,randomseed);
	canvasResize();
        gifDataResize();

        encoder.setSize(trueGIFWidth, trueGIFHeight);

        regenGIFText();
        regenGIFSpriteImages();

	gifRedraw();

  	encoder.addFrame(gifDataToImageData(), true);
	var autotimer=0;

  	for(var i=0;i<inputDat.length;i++) {
  		var realtimeframe=false;
		var val=inputDat[i];
		if (val==="undo") {
			DoUndo(false,true);
		} else if (val==="restart") {
			DoRestart();
		} else if (val=="tick") {
			processInput(-1);
			realtimeframe=true;
		} else {
			processInput(val);
		}
		gifRedraw();
                encoder.addFrame(gifDataToImageData(), true);
		encoder.setDelay(realtimeframe?autotickinterval:repeatinterval);
		autotimer+=repeatinterval;

		while (againing) {
			processInput(-1);
			gifRedraw();
			encoder.setDelay(againinterval);
                        encoder.addFrame(gifDataToImageData(), true);
		}
	}

  	encoder.finish();
  	var dat = 'data:image/gif;base64,'+encode64(encoder.stream().getData());
  	window.open(dat);

        redraw();

  	unitTesting = false;
}