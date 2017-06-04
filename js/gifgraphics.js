function colorHexToRGB(color) {
    var iVal = parseInt(color.substring(1,7), 16);
    return [((iVal >>> 16) & 255), ((iVal >>> 8) & 255), (iVal & 255)];
}

function colorLookupInTable(colorIn) {
    var color = colorIn.toLowerCase();
    if (color == "transparent")
        return -1;
    if (color.length == 4) {
        color = "#".concat(color[1], color[1], color[2], color[2], color[3], color[3]);
    }
    var pos = gifColorTabHex.indexOf(color);
    if (pos == -1) {
        gifColorTab = gifColorTab.concat(colorHexToRGB(color));
        pos = gifColorTabHex.length;
        gifColorTabHex.push(color);
    }
    return pos;
}

function gifCreateBlankSprite(size) {
    return Array(size).fill(-1);
}

function gifCreateSprite(spritegrid, colors, padding) {
    if (colors === undefined) {
        colors = [state.bgcolor, state.fgcolor];
    }

    var w = spritegrid[0].length;
    var h = spritegrid.length;
    var tw = w + (padding|0);
    var th = h + (padding|0);
    var sprite = gifCreateBlankSprite(tw * th);
    var numericColors = colors.map(colorLookupInTable);

    for (var j = 0; j < w; j++) {
        for (var k = 0; k < h; k++) {
            var val = spritegrid[k][j];
            if (val >= 0) {
                var pos = tw * k + j;
                sprite[pos] = numericColors[val];
            }
        }
    }

    return sprite;
}

function gifResetColorTables() {
    gifColorTab = [];
    gifColorTabHex = [];
}

function gifRegenText() {
	gifTextImages={};

	for (var n in font) {
		if (font.hasOwnProperty(n)) {
			gifTextImages[n] = gifCreateSprite(font[n], undefined, 1);
		}
	}
}

var gifSpriteImages;
var gifColorTab;
var gifColorTabHex;

function gifRegenSpriteImages() {

    if (state.levels.length===0) {
        return;
    }
    gifSpriteImages = [];

    for (var i = 0; i < sprites.length; i++) {
        if (sprites[i] == undefined) {
            continue;
        }
        gifSpriteImages[i] = gifCreateSprite(sprites[i].dat, sprites[i].colors);
    }

}

var gifData;
var gifDataWidth;
var gifDataHeight;
var gifW;
var gifH;
var gifScale;
var trueGIFWidth;
var trueGIFHeight;

function gifDataResize() {
    if (gifData === undefined) {
        gifData = Array(0);
    }

    gifW = 5;
    gifH = 5;

    if (textMode) {
        gifW = 6;
        gifH = 6;
    }

    gifDataWidth = gifW * screenwidth;
    gifDataHeight = gifH * screenheight;

    gifData.length = gifDataWidth * gifDataHeight;

    gifScale = cellwidth / gifW;

    trueGIFWidth = gifDataWidth * gifScale;
    trueGIFHeight = gifDataHeight * gifScale;

    if (forceRegenGIFImages) {
        gifResetColorTables();
        gifRegenText();
        gifRegenSpriteImages();
        forceRegenGIFImages = false;
    }
}

function gifDataToImageData(storeTo) {
    var res = storeTo;
    if (res === undefined)
        res = new Uint8ClampedArray(trueGIFWidth * trueGIFHeight * 4);
    res.fill(255);
    var vHt = gifScale;
    var doScanline = ("scanline" in state.metadata);
    if (doScanline) {
        vHt = (gifScale / 2) | 0;
        var bgIndex = colorLookupInTable(state.bgcolor);
        var bgRed = gifColorTab[3*bgIndex];
        var bgGreen = gifColorTab[3*bgIndex+1];
        var bgBlue = gifColorTab[3*bgIndex+2];
        for (var i = 0; i < trueGIFWidth; i++) {
            var elt = 4 * (i + vHt * trueGIFWidth);
            res[elt] = bgRed;
            res[elt+1] = bgGreen;
            res[elt+2] = bgBlue;
        }
    }
    for (var j = 0; j < gifDataHeight; j++) {
        for (var i = 0; i < gifDataWidth; i++) {
            var color = gifData[i+j*gifDataWidth];
            var red = gifColorTab[3*color];
            var green = gifColorTab[3*color+1];
            var blue = gifColorTab[3*color+2];
            for (var k = 0; k < gifScale; k++) {
                var elt = 4 * (i * gifScale + k + (j * gifScale) * trueGIFWidth);
                res[elt] = red;
                res[elt+1] = green;
                res[elt+2] = blue;
            }
        }
        for (i = 1; i < vHt; i++) {
            res.copyWithin(4 * (j * gifScale + i) * trueGIFWidth, 4 * j * gifScale * trueGIFWidth, 4 * (j * gifScale + 1) * trueGIFWidth);
        }
        if (doScanline) {
            for (i = (j == 0 ? 1 : 0) + vHt; i < gifScale; i++) {
                res.copyWithin(4 * (j * gifScale + i) * trueGIFWidth, 4 * vHt * trueGIFWidth, 4 * (vHt + 1) * trueGIFWidth);
            }
        }
    }
    return res;
}

function gifDataToIndexedImageData() {
    var res = new Uint8ClampedArray(trueGIFWidth * trueGIFHeight);
    res.fill(colorLookupInTable(state.bgcolor));
    var vHt = gifScale;
    if ("scanline" in state.metadata) {
        vHt = (gifScale / 2) | 0;
    }
    for (var j = 0; j < gifDataHeight; j++) {
        for (var i = 0; i < gifDataWidth; i++) {
            var color = gifData[i+j*gifDataWidth];
            var elt = gifScale * (i + j * trueGIFWidth);
            res.fill(color, elt, elt + gifScale);
        }
        for (i = 1; i < vHt; i++) {
            res.copyWithin((j * gifScale + i) * trueGIFWidth, j * gifScale * trueGIFWidth, (j * gifScale + 1) * trueGIFWidth);
        }
    }
    return res;
}

function gifDrawImage(sprite, xoff, yoff) {
    for (var i = 0; i < gifW; i++) {
        for (var j = 0; j < gifH; j++) {
            if (sprite[i+j*gifW] >= 0)
                gifData[i+xoff*gifW+(yoff*gifH+j)*gifDataWidth] = sprite[i+j*gifW];
        }
    }
}

function gifRedraw() {
    if (cellwidth===0||cellheight===0) {
        return;
    }

    if (gifColorTab === undefined) {
        forceRegenGIFImages = true;
    }

    if (forceRegenGIFImages) {
        gifDataResize();
    }

    if (textMode) {
        gifData.fill(colorLookupInTable(state.bgcolor));

        for (var i = 0; i < titleWidth; i++) {
            for (var j = 0; j < titleHeight; j++) {
                var ch = titleImage[j].charAt(i);
                if (ch in gifTextImages) {
                    var sprite = gifTextImages[ch];
                    gifDrawImage(sprite, i, j);
                }
            }
        }
        return;
    } else {
        gifData.fill(colorLookupInTable(state.bgcolor));

        var mini=0;
        var maxi=screenwidth;
        var minj=0;
        var maxj=screenheight;

        if (levelEditorOpened) {
            var glyphcount = glyphCount();
            editorRowCount = Math.ceil(glyphcount/(screenwidth-1));
            maxi-=2;
            maxj-=2+editorRowCount;
        } if (flickscreen) {
            var playerPositions = getPlayerPositions();
            if (playerPositions.length>0) {
                var playerPosition=playerPositions[0];
                var px = (playerPosition/(level.height))|0;
                var py = (playerPosition%level.height)|0;

                var screenx = (px/screenwidth)|0;
                var screeny = (py/screenheight)|0;
                mini=screenx*screenwidth;
                minj=screeny*screenheight;
                maxi=Math.min(mini+screenwidth,level.width);
                maxj=Math.min(minj+screenheight,level.height);

                oldflickscreendat=[mini,minj,maxi,maxj];
            } else if (oldflickscreendat.length>0){
                mini=oldflickscreendat[0];
                minj=oldflickscreendat[1];
                maxi=oldflickscreendat[2];
                maxj=oldflickscreendat[3];
            }
        } else if (zoomscreen) {
            var playerPositions = getPlayerPositions();
            if (playerPositions.length>0) {
                var playerPosition=playerPositions[0];
                var px = (playerPosition/(level.height))|0;
                var py = (playerPosition%level.height)|0;
                mini=Math.max(Math.min(px-((screenwidth/2)|0),level.width-screenwidth),0);
                minj=Math.max(Math.min(py-((screenheight/2)|0),level.height-screenheight),0);
                maxi=Math.min(mini+screenwidth,level.width);
                maxj=Math.min(minj+screenheight,level.height);
                oldflickscreendat=[mini,minj,maxi,maxj];
            }  else if (oldflickscreendat.length>0){
                mini=oldflickscreendat[0];
                minj=oldflickscreendat[1];
                maxi=oldflickscreendat[2];
                maxj=oldflickscreendat[3];
            }
        }


        for (var i = mini; i < maxi; i++) {
            for (var j = minj; j < maxj; j++) {
                var posIndex = j + i * level.height;
                var posMask = level.getCellInto(posIndex,_o12);
                for (var k = 0; k < state.objectCount; k++) {
                    if (posMask.get(k) != 0) {
                        var sprite = gifSpriteImages[k];
                        gifDrawImage(sprite, i - mini, j - minj);
                    }
                }
            }
        }

    }
}

function gifRedrawToCanvas() {
    if (cellwidth===0&&cellheight===0)
        return;

    gifRedraw();

    var imageData = ctx.createImageData(trueGIFWidth, trueGIFHeight);
    gifDataToImageData(imageData.data);
    ctx.putImageData(imageData, xoffset, yoffset);

    if(!textMode&&levelEditorOpened)
        drawEditorIcons();
}
/* Normal graphics using GIF graphics methods */
/*var gifGlyphImages;
var gifGlyphHighlight;
var gifGlyphHighlightResize;
var gifGlyphPrintButton;
var gifGlyphMouseOver;
var gifEditMouseX;
var gifEditMouseY;
var gifEditSelectedX;
var gifEditSelectedY;
var gifMouseType;

function gifDrawOnImage(target, sprite) {
    for (var i = 0; i < gifW; i++) {
        for (var j = 0; j < gifH; j++) {
            if (sprite[i+j*gifW] >= 0)
                target[i+j*gifW] = sprite[i+j*gifW];
        }
    }
}

function gifGenerateGlyphImages() {
    if (cellwidth===0||cellheight===0) {
        return;
    }

    gifGlyphImages=[];

    for (var n in state.glyphDict) {
        if (n.length==1 && state.glyphDict.hasOwnProperty(n)) {
            var g=state.glyphDict[n];
            var sprite = gifCreateBlankImage(gifW * gifH);
            for (var i=0;i<g.length;i++){
                var id = g[i];
                if (id===-1) {
                    continue;
                }
		gifDrawOnImage(sprite, gifSpriteImages[id]);
            }
            gifGlyphImages.push(sprite);
        }
    }

    {
        //make highlight thingy
        glyphHighlight = gifCreateBlankImage(gifW * gifHmakeSpriteCanvas("highlight");
		var spritectx = glyphHighlight.getContext('2d');
		spritectx.fillStyle = '#FFFFFF';

		spritectx.fillRect(0,0,cellwidth,1);
		spritectx.fillRect(0,0,1,cellheight);
		
		spritectx.fillRect(0,cellheight-1,cellwidth,1);
		spritectx.fillRect(cellwidth-1,0,1,cellheight);
	}

	{
		glyphPrintButton = textImages['s'];
	}
	{
		//make highlight thingy
		glyphHighlightResize = makeSpriteCanvas("highlightresize");
		var spritectx = glyphHighlightResize.getContext('2d');
		spritectx.fillStyle = '#FFFFFF';
		
		var minx=((cellwidth/2)-1)|0;
		var xsize=cellwidth-minx-1-minx;
		var miny=((cellheight/2)-1)|0;
		var ysize=cellheight-miny-1-minx;

		spritectx.fillRect(minx,0,xsize,cellheight);
		spritectx.fillRect(0,miny,cellwidth,ysize);
	}

	{
		//make highlight thingy
		glyphMouseOver = makeSpriteCanvas();
		var spritectx = glyphMouseOver.getContext('2d');
		spritectx.fillStyle = 'yellow';
		
		spritectx.fillRect(0,0,cellwidth,2);
		spritectx.fillRect(0,0,2,cellheight);
		
		spritectx.fillRect(0,cellheight-2,cellwidth,2);
		spritectx.fillRect(cellwidth-2,0,2,cellheight);
	}
        }*/