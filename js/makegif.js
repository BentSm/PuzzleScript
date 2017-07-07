function makeGIF(useTransIn) {
	var addNextFrame = function addNextFrame() {
	    if (indexed) {
		var nFrame = gifDataToIndexedImageDataWTransPlus(prevData, useTrans);
		encoder.addFrame(nFrame.data, true, nFrame.x, nFrame.y, nFrame.w, nFrame.h);
		if (useTrans) {
		    prevData = gifData.concat([]);
		}
	    } else {
		encoder.addFrame(gifDataToImageData(), true);
	    }
	}
	var useTrans = (useTransIn === undefined ? true : useTransIn);
	var prevData = undefined;
	var randomseed = RandomGen.seed;
	levelEditorOpened=false;
	var targetlevel=curlevel;

	var inputDat = inputHistory.concat([]);

	unitTesting=true;
	levelString=compiledText;



	var encoder = new GIFEncoder();
	encoder.setRepeat(0); //auto-loop
	encoder.setDelay(200);
	if (useTrans) {
	    encoder.setDispose(1);
	}
	encoder.start();

	compile(["loadLevel",curlevel],levelString,randomseed);
	canvasResize();
        gifDataResize();

        encoder.setSize(trueGIFWidth, trueGIFHeight);

	gifRedraw();

        var indexed = (gifColorTabHex.length <= (useTrans ? 255 : 256));

        if (indexed) {
	    var trans = (useTrans ? gifGetTransparentIndex() : -1);
            encoder.setGCT(gifColorTab, trans);
        }

	addNextFrame();
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
		addNextFrame();
		encoder.setDelay(realtimeframe?autotickinterval:repeatinterval);
		autotimer+=repeatinterval;

		while (againing) {
			processInput(-1);
			gifRedraw();
			encoder.setDelay(againinterval);
			addNextFrame();
		}
	}

  	encoder.finish();
  	var dat = 'data:image/gif;base64,'+encode64(encoder.stream().getData());
  	window.open(dat);

        redraw();

  	unitTesting = false;

        inputHistory = inputDat;
}