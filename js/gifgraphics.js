function colorHexToInt(color) {
    return parseInt(color.substring(1,7), 16);
}

function createGIFSprite(spritegrid, colors, padding) {
    if (colors === undefined) {
        colors = [state.bgcolor, state.fgcolor];
    }

    var w = spritegrid[0].length;
    var h = spritegrid.length;
    var tw = w + (padding|0);
    var th = h + (padding|0);
    var sprite = Array(tw * th).fill(-1);
    var numericColors = colors.map(colorHexToInt);

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

function regenGIFText() {
	gifTextImages={};

	for (var n in font) {
		if (font.hasOwnProperty(n)) {
			gifTextImages[n] = createGIFSprite(font[n], undefined, 1);
		}
	}
}

var gifSpriteImages;

function regenGIFSpriteImages() {

    if (state.levels.length===0) {
        return;
    }
    gifSpriteImages = [];

    for (var i = 0; i < sprites.length; i++) {
        if (sprites[i] == undefined) {
            continue;
        }
        gifSpriteImages[i] = createGIFSprite(sprites[i].dat, sprites[i].colors);
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
}

function colorIntToRGBA(color) {
    return [((color >>> 16) & 255), ((color >>> 8) & 255), (color & 255), 255];
}

function gifReplicateValue(n, val) {
    return Array(n).fill(val);
}

/*function gifDataToImageData() {
    var res = [];
    var replicateFn = gifReplicateValue.bind(null, gifScale);
    var clearAt = -1;
    if ("scanline" in state.metadata) {
        clearAt = (gifScale / 2) | 0;
    }
    for (var i = 0; i < gifDataHeight; i++) {
        var row = [].concat.apply([], gifData.slice(i*gifDataWidth,
                                                    (i+1)*gifDataWidth).map(replicateFn));
        for (var j = 0; j < gifScale; j++) {
            if (j == clearAt) {
                row.fill(0);
            }
            res = res.concat(row);
        }
    }
    return [].concat.apply([], res.map(colorIntToRGBA));
    }*/

function gifDataToImageData() {
    var res = new Uint8Array(trueGIFWidth * trueGIFHeight * 4);
    res.fill(255);
    var vHt = gifScale;
    if ("scanline" in state.metadata) {
        vHt = (gifScale / 2) | 0;
    }
    for (var i = 0; i < gifDataWidth; i++) {
        for (var j = 0; j < gifDataHeight; j++) {
            var color = gifData[i+j*gifDataWidth];
            var red = (color >>> 16) & 255;
            var green = (color >>> 8) & 255;
            var blue = color & 255;
            for (var k = 0; k < gifScale; k++) {
                for (var l = 0; l < vHt; l++) {
                    var elt = 4 * (i * gifScale + k + (j * gifScale + l) * trueGIFWidth);
                    res[elt] = red;
                    res[elt+1] = green;
                    res[elt+2] = blue;
                }
            }
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

    if (textMode) {
        if (gifTextImages===undefined) {
            regenGIFText();
        }

        gifData.fill(colorHexToInt(state.bgcolor));

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
        if (gifSpriteImages===undefined) {
            regenGIFSpriteImages();
        }
        gifData.fill(colorHexToInt(state.bgcolor));

        var mini=0;
        var maxi=screenwidth;
        var minj=0;
        var maxj=screenheight;

        if (flickscreen) {
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


