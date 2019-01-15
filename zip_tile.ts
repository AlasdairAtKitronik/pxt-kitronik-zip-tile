/**
 * Well known colors for ZIP LEDs
 */
enum ZipLedColors {
    //% block=red
    Red = 0xFF0000,
    //% block=orange
    Orange = 0xFFA500,
    //% block=yellow
    Yellow = 0xFFFF00,
    //% block=green
    Green = 0x00FF00,
    //% block=blue
    Blue = 0x0000FF,
    //% block=indigo
    Indigo = 0x4b0082,
    //% block=violet
    Violet = 0x8a2be2,
    //% block=purple
    Purple = 0xFF00FF,
    //% block=white
    White = 0xFFFFFF,
    //% block=black
    Black = 0x000000
}
/**
 * Kitronik ZIP Tile MakeCode Package
 */
//% weight=100 color=#00A654 icon="\uf009" block="ZIP Tile"
namespace Kitronik_Zip_Tile {
    /**
     * Different directions for text to travel
     */
    export enum TextDirection {
        //% block="Left"
        Left,
        ////% block="Right"
        //Right,
        //% block="Up"
        Up
        ////% block="Down"
        //Down
    }

	/**
	 * Different modes for RGB or RGB+W ZIP strips
	 */
	export enum ZipLedMode {
	    //% block="RGB (GRB format)"
	    RGB = 0,
	    //% block="RGB+W"
	    RGBW = 1,
	    //% block="RGB (RGB format)"
	    RGB_RGB = 2
	}

    /**
     * Different configurations for micro:bit location in a multi-tile display
     * Use standard for a single tile
     */
    export enum UBitLocations {
        //% block="Standard"
        Standard,
        //% block="Top"
        Top,
        //% block="Bottom"
        Bottom
    }

    /**
     * Different formatting styles for scrolling text
     */
    export enum TextStyle {
        //% block="None"
        None,
        //% block="Underlined"
        Underlined,
        //% block="Background"
        Background
    }

    export class ZIPTileDisplay {
    	buf: Buffer;
    	pin: DigitalPin;
    	brightness: number;
    	start: number;
    	_length: number;
    	_mode: ZipLedMode;
    	_matrixWidth: number;
        _matrixHeight: number;
        _uBitLocation: UBitLocations;

        /**
         * Shows a rainbow pattern on all LEDs. 
         * @param startHue the start hue value for the rainbow, eg: 1
         * @param endHue the end hue value for the rainbow, eg: 360
         */
        //% blockId="kitronik_set_zip_tile_rainbow" block="%tile|show rainbow from %startHue|to %endHue" 
        //% weight=60 blockGap=8
        showRainbow(startHue: number = 1, endHue: number = 360) {
            if (this._length <= 0) return;

            startHue = startHue >> 0;
            endHue = endHue >> 0;
            const saturation = 100;
            const luminance = 50;
            const steps = this._length;
            const direction = HueInterpolationDirection.Clockwise;

            //hue
            const h1 = startHue;
            const h2 = endHue;
            const hDistCW = ((h2 + 360) - h1) % 360;
            const hStepCW = Math.idiv((hDistCW * 100), steps);
            const hDistCCW = ((h1 + 360) - h2) % 360;
            const hStepCCW = Math.idiv(-(hDistCCW * 100), steps);
            let hStep: number;
            if (direction === HueInterpolationDirection.Clockwise) {
                hStep = hStepCW;
            } else if (direction === HueInterpolationDirection.CounterClockwise) {
                hStep = hStepCCW;
            } else {
                hStep = hDistCW < hDistCCW ? hStepCW : hStepCCW;
            }
            const h1_100 = h1 * 100; //we multiply by 100 so we keep more accurate results while doing interpolation

            //sat
            const s1 = saturation;
            const s2 = saturation;
            const sDist = s2 - s1;
            const sStep = Math.idiv(sDist, steps);
            const s1_100 = s1 * 100;

            //lum
            const l1 = luminance;
            const l2 = luminance;
            const lDist = l2 - l1;
            const lStep = Math.idiv(lDist, steps);
            const l1_100 = l1 * 100

            //interpolate
            if (steps === 1) {
                this.setPixelColor(0, hsl(h1 + hStep, s1 + sStep, l1 + lStep))
            } else {
                this.setPixelColor(0, hsl(startHue, saturation, luminance));
                for (let i = 1; i < steps - 1; i++) {
                    const h = Math.idiv((h1_100 + i * hStep), 100) + 360;
                    const s = Math.idiv((s1_100 + i * sStep), 100);
                    const l = Math.idiv((l1_100 + i * lStep), 100);
                    this.setPixelColor(i, hsl(h, s, l));
                }
                this.setPixelColor(steps - 1, hsl(endHue, saturation, luminance));
            }
            this.show();
        }

        /**
         * Rotate LEDs forward.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of ZIP LEDs to rotate forward, eg: 1
         */
        //% blockId="kitronik_zip_tile_display_rotate" block="%tile|rotate ZIP LEDs by %offset" blockGap=8
        //% weight=50
        rotate(offset: number = 1): void {
            const stride = this._mode === ZipLedMode.RGBW ? 4 : 3;
            this.buf.rotate(-offset * stride, this.start * stride, this._length * stride)
        }

    	/**
         * Shows whole ZIP Tile display as a given color (range 0-255 for r, g, b). 
         * @param rgb RGB color of the LED
         */
        //% blockId="kitronik_zip_tile_display_set_strip_color" block="%tile|show color %rgb=zip_colors" 
        //% weight=98 blockGap=8
        showColor(rgb: number) {
        	rgb = rgb >> 0;
            this.setAllRGB(rgb);
            this.show();
        }

    	/**
         * Set LED to a given color (range 0-255 for r, g, b) in the matrix 
         * You need to call ``show`` to make the changes visible.
         * @param x horizontal position
         * @param y horizontal position
         * @param rgb RGB color of the LED
         */
        //% blockId="kitronik_zip_tile_display_set_matrix_color" block="%tile|set matrix color at x %x|y %y|to %rgb=zip_colors" 
        //% weight=99
        setMatrixColor(x: number, y: number, rgb: number) {
            let LEDS_ON_PANEL = 64
            let COLUMNS = this._matrixWidth
            let ROWS = this._matrixHeight
            let totalPanels = (this._length/LEDS_ON_PANEL)
            let currentPanel = 0
            let i = 0
            x = x >> 0
            y = y >> 0
            rgb = rgb >> 0
            if (x < 0 || x >= COLUMNS || y < 0 || y >= ROWS) return
            let yDiv = y / 8
            let xDiv = x / 8
            let floorY = Math.floor(yDiv)
            let floorX = Math.floor(xDiv)
            //let floorY = parseInt(("" + yDiv + "").charAt(0))
            //let floorX = parseInt(("" + xDiv + "").charAt(0))
            //let floorY = Math.idiv(yDiv)
            //let floorX = Math.idiv(xDiv)
            if (ROWS == 8) {
                i = (x + 8 * y) + (floorX * (LEDS_ON_PANEL - 8))
            }
            else if (COLUMNS == 8) {
                if (this._uBitLocation == UBitLocations.Top) {
                    if (y < 8) {
                        currentPanel = 1
                    }
                    else {
                        currentPanel = 2
                    }
                }
                else if (this._uBitLocation == UBitLocations.Bottom || this._uBitLocation == UBitLocations.Standard) {
                    if (y < 8) {
                        currentPanel = 2
                    }
                    else {
                        currentPanel = 1
                    }
                }
                i = ((2 * floorY) - 1) * (x + 8 * y) + (currentPanel * LEDS_ON_PANEL) - 1 - (floorY * ((totalPanels * LEDS_ON_PANEL) - 1))
            }
            else if (COLUMNS == 16 && ROWS == 16) {
                i = (-255 * (floorY - 1)) + (2 * floorY - 1) * (x + 8 * (y - floorY * 8)) + floorY * floorX * (LEDS_ON_PANEL - 8) + (floorY - 1) * (floorX * 56)
            }
            this.setPixelColor(i, rgb)
        }

        /**
         * Scroll text across tile (select direction, speed & colour)
         * Set LED to a given color (range 0-255 for r, g, b) in the 8 x 8 matrix 
         * @param text is the text to scroll
         * @param direction the text will travel
         * @param delay the pause time between each display refresh
         * @param style extra formatting of the text (such as underlined)
         * @param rgb RGB color of the text
         * @param formatRGB RGB color of the text
         */
        //% blockId="kitronik_zip_tile_scroll_text" block="%tile|scroll %text|%direction|delay (ms) %delay|formatting %style|format colour %formatRGB=zip_colors|text colour %rgb=zip_colors" 
        //% weight=98
        scrollText(text: string, direction: TextDirection, delay: number, style: TextStyle, formatRGB: number, rgb: number) {
            let LEDS_ON_PANEL = 64
            let COLUMNS = this._matrixWidth
            let ROWS = this._matrixHeight
            let totalPanels = (this._length/LEDS_ON_PANEL)
            let textBrightness = this.brightness
            let backBrightness = textBrightness/6
            let lineColOffset = 0
            let currentPanel = 0
            let textLength = 0 //This is really the width in individual pixels, calculated in next step if direction = LEFT
            let textHeight = 0 //Height in individual pixels, calculated in next step if direction = UP
            let textChar = 0

            switch (direction) {
                case TextDirection.Up:
                    for (textChar = 0; textChar < text.length; textChar++) {
                        textHeight += 6
                    }
                    //Setup for static text display
                    if (textHeight <= ROWS) {
                        //Make text static display for set length of time
                        break
                    }
                    for (let row = 0; row < textHeight + ROWS; row ++) {
                        this.clear()
                        if (style == TextStyle.Background) {
                            this.brightness = backBrightness
                            this.showColor(formatRGB)
                        }
                        //this.show()
                        let offsetRow = 0
                        for (let stringLength = 0; stringLength < text.length; stringLength++) {
                            this.brightness = textBrightness
                            let height = 5
                            if ((-row + ROWS) + offsetRow >= ROWS) {
                                break
                            }
                            if ((-row + ROWS) + offsetRow + height < 0) {
                                offsetRow += height + 1
                                continue
                            }
                            let textData: Buffer = getChar(text.charAt(stringLength))
                            for (let c_row = 0; c_row < 5; c_row++) {
                                for (let c_col = 0; c_col < 5; c_col++) {
                                    if ((textData[c_row] & (1 << (4 - c_col))) > 0) {
                                        let yValue = ((-row + ROWS) + offsetRow + c_row)
                                        let yDiv = yValue / 8
							            let floorY = Math.floor(yDiv)
							            if (totalPanels > 1) {
							            	if (this._uBitLocation == UBitLocations.Standard || this._uBitLocation == UBitLocations.Bottom) {
	                                            if (yValue < 8) {
	                                                currentPanel = 2
	                                            }
	                                            else {
	                                                currentPanel = 1
	                                            }
	                                        }
	                                        else if (this._uBitLocation == UBitLocations.Top) {
	                                            if (yValue < 8) {
	                                                currentPanel = 1
	                                            }
	                                            else {
	                                                currentPanel = 2
	                                            }
	                                        }
	                                        if (yValue < ROWS && yValue >= 0) {
	                                            let i = (((2 * floorY) - 1) * ((2 + c_col) + 8 * yValue)) + (currentPanel * LEDS_ON_PANEL) - 1 - (floorY * ((totalPanels * LEDS_ON_PANEL) - 1))
	                                            this.setPixelColor(i, rgb)
	                                            //this.show()
	                                        }
							            }
	                                    else {
	                                    	if (yValue < ROWS && yValue >= 0) {
	                                            let i = (2 + c_col) + 8 * yValue
	                                            this.setPixelColor(i, rgb)
	                                            //this.show()
	                                        }
	                                    } 
                                    }
                                }
                            }
                            offsetRow += height + 1
                        }
                        this.show()
                        if (delay > 0) {
                            control.waitMicros(delay * 1000)
                        }
                    }
                    break
                case TextDirection.Left:
                    let endOfLine = 23
                    for (textChar = 0; textChar < text.length; textChar++) {
                        textLength += charWidth(text.charAt(textChar)) + 1
                    }
                    //Setup for static text display
                    if (textLength <= COLUMNS) {
                        //Make text static display for set length of time
                        for (let column = 0; column < COLUMNS; column++) {
                            for (let stringLength = 0; stringLength < text.length; stringLength++) {
                                this.brightness = textBrightness
                                let width = charWidth(text.charAt(stringLength))
                                let textData: Buffer = getChar(text.charAt(stringLength))
                                for (let c_row = 0; c_row < 5; c_row++) {
                                    for (let c_col = 0; c_col < 5; c_col++) {
                                        if ((textData[c_row] & (1 << (4 - c_col))) > 0) {
                                            let xValue = COLUMNS + c_col
                                            let xDiv = xValue / 8
                                            let floorX = Math.floor(xDiv)
                                            if (xValue < COLUMNS && xValue >= 0) {
                                                let i = (xValue + ((2 + c_row) * 8)) + (floorX * (LEDS_ON_PANEL - 8))
                                                this.setPixelColor(i, rgb)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        this.show()
                        break
                    }
                    for (let column = 0; column < textLength + COLUMNS; column++) {
                        this.clear()
                        if (style == TextStyle.Background) {
                            this.brightness = backBrightness
                            this.showColor(formatRGB)
                        }
                        if (style == TextStyle.Underlined) {
                            let lineCol = COLUMNS - column - 1
                            let floorLineCol = Math.floor(lineCol / 8)
                            let lineLED = lineCol + (7 * 8) + (floorLineCol * (LEDS_ON_PANEL - 8))
                            this.setPixelColor(lineLED, formatRGB)
                            
                            for (let extraLineCol = lineCol; extraLineCol < COLUMNS; extraLineCol ++) {
                                if (extraLineCol < 0 || extraLineCol > COLUMNS) {
                                    continue
                                }
                                let floorExtraLineCol = Math.floor(extraLineCol / 8)
                                let extraLineLED = extraLineCol + (7 * 8) + (floorExtraLineCol * (LEDS_ON_PANEL - 8))
                                if (column > textLength + 1) {
                                    if (extraLineCol >= endOfLine) {
                                        this.setPixelColor(extraLineLED, 0x000000)
                                    }
                                    else {
                                        this.setPixelColor(extraLineLED, formatRGB)
                                    }
                                }
                                else {
                                    this.setPixelColor(extraLineLED, formatRGB)
                                }
                            }
                        }
                        //this.show()
                        let offsetColumn = 0
                        for (let stringLength = 0; stringLength < text.length; stringLength++) {
                            this.brightness = textBrightness
                            let width = charWidth(text.charAt(stringLength))
                            if ((-column + COLUMNS) + offsetColumn >= COLUMNS) {
                                break
                            }
                            if ((-column + COLUMNS) + offsetColumn + width < 0) {
                                offsetColumn += width + 1
                                continue
                            }
                            let textData: Buffer = getChar(text.charAt(stringLength))
                            for (let c_row = 0; c_row < 5; c_row++) {
                                for (let c_col = 0; c_col < 5; c_col++) {
                                    if ((textData[c_row] & (1 << (4 - c_col))) > 0) {
                                        let xValue = (-column + COLUMNS) + offsetColumn + c_col
							            let xDiv = xValue / 8
							            let floorX = Math.floor(xDiv)
                                        if (xValue < COLUMNS && xValue >= 0) {
                                            let i = (xValue + ((2 + c_row) * 8)) + (floorX * (LEDS_ON_PANEL - 8))
                                            this.setPixelColor(i, rgb)
                                        }
                                    }
                                }
                            }
                            offsetColumn += width + 1
                            if (lineColOffset == (COLUMNS - 1)) {
                                lineColOffset == 0
                            }
                            else {
                                lineColOffset += 1
                            }
                        }
                        this.show()
                        if (delay > 0) {
                            control.waitMicros(delay * 1000)
                        }
                        if (column > textLength + 1) {
                            endOfLine--
                        }
                    }
                    break
            }
            if (style != TextStyle.None) {
                this.clear()
                this.show()
            }
            this.brightness = textBrightness
        }

        /**
         * Send all the changes to the ZIP Tile display.
         */
        //% blockId="kitronik_zip_tile_display_show" block="%tile|show" blockGap=8
        //% weight=97
        show() {
            ws2812b.sendBuffer(this.buf, this.pin);
        }

        /**
         * Turn off all LEDs on the ZIP Tile display.
         * You need to call ``show`` to make the changes visible.
         */
        //% blockId="kitronik_zip_tile_display_clear" block="%tile|clear"
        //% weight=96
        
        clear(): void {
            const stride = this._mode === ZipLedMode.RGBW ? 4 : 3;
            this.buf.fill(0, this.start * stride, this._length * stride);
        }

        /**
         * Set the brightness of the ZIP Tile display. This flag only applies to future operation.
         * @param brightness a measure of LED brightness in 0-255. eg: 255
         */
        //% blockId="kitronik_zip_tile_display_set_brightness" block="%tile|set brightness %brightness" blockGap=8
        //% weight=95
        
        setBrightness(brightness: number): void {
            this.brightness = brightness & 0xff;
        }

        /**
         * Set the pin where the ZIP LED is connected, defaults to P0.
         */
        //% weight=10
        
        setPin(pin: DigitalPin): void {
            this.pin = pin;
            pins.digitalWritePin(this.pin, 0);
            // don't yield to avoid races on initialization
    	}

    	private setPixelColor(pixeloffset: number, rgb: number): void {
            this.setPixelRGB(pixeloffset, rgb);
        }

        private setBufferRGB(offset: number, red: number, green: number, blue: number): void {
            if (this._mode === ZipLedMode.RGB_RGB) {
                this.buf[offset + 0] = red;
                this.buf[offset + 1] = green;
            } else {
                this.buf[offset + 0] = green;
                this.buf[offset + 1] = red;
            }
            this.buf[offset + 2] = blue;
        }

        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const br = this.brightness;
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            const end = this.start + this._length;
            const stride = this._mode === ZipLedMode.RGBW ? 4 : 3;
            for (let i = this.start; i < end; ++i) {
                this.setBufferRGB(i * stride, red, green, blue)
            }
        }
        private setAllW(white: number) {
            if (this._mode !== ZipLedMode.RGBW)
                return;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            let end = this.start + this._length;
            for (let i = this.start; i < end; ++i) {
                let ledoffset = i * 4;
                buf[ledoffset + 3] = white;
            }
        }
        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            let stride = this._mode === ZipLedMode.RGBW ? 4 : 3;
            pixeloffset = (pixeloffset + this.start) * stride;

            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            let br = this.brightness;
            if (br < 255) {
                red = (red * br) >> 8;
                green = (green * br) >> 8;
                blue = (blue * br) >> 8;
            }
            this.setBufferRGB(pixeloffset, red, green, blue)
        }
        private setPixelW(pixeloffset: number, white: number): void {
            if (this._mode !== ZipLedMode.RGBW)
                return;

            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            pixeloffset = (pixeloffset + this.start) * 4;

            let br = this.brightness;
            if (br < 255) {
                white = (white * br) >> 8;
            }
            let buf = this.buf;
            buf[pixeloffset + 3] = white;
        }
    }

    /**
     * Create a new ZIP LED driver for ZIP Tile Display.
     * @param columns the total number of ZIP LED columns across all connected tiles
     * @param rows the total number of ZIP LED rows across all connected tiles
     * @param uBitConfig postion of the microbit in a multipanel display (for a single tile, leave as 'Standard')
     */
    //% blockId="kitronik_zip_tile_display_create" block="ZIP Tile display with %columns|columns and %rows|rows with uBit location %uBitConfig|"
    //% weight=100 blockGap=8
    //% trackArgs=0,2
    //% blockSetVariable=tile
    export function createZIPTileDisplay(columns: number, rows: number, uBitConfig: UBitLocations): ZIPTileDisplay {
        let tile = new ZIPTileDisplay();
        let stride = 0 === ZipLedMode.RGBW ? 4 : 3;
        tile.buf = pins.createBuffer((columns * rows) * stride);
        tile.start = 0;
        tile._length = (columns*rows);
        tile._mode = 0;
        tile._matrixWidth = columns;
        tile._matrixHeight = rows;
        tile._uBitLocation = uBitConfig;
        tile.setBrightness(255)
        tile.setPin(DigitalPin.P0)
        return tile;
    }

    //% shim=Kitronik_Zip_Tile::getFontDataByte
    function getFontDataByte(index: number): number {
        return 0;
    }

    //% shim=Kitronik_Zip_Tile::getFontData
    function getFontData(index: number): Buffer {
        return pins.createBuffer(5);
    }

    //% shim=Kitronik_Zip_Tile::getCharWidth
    function getCharWidth(char: number): number {
        return 5;
    }

    function getChar(character: string): Buffer {
        return getFontData(character.charCodeAt(0));
    }

    function charWidth(character: string): number {
        let charcode: number = character.charCodeAt(0)
        if (charcode > DAL.MICROBIT_FONT_ASCII_END) {
            return 5;
        }
        return getCharWidth(charcode);
    }

    /**
     * Converts red, green, blue channels into a RGB color
     * @param red value of the red channel between 0 and 255. eg: 255
     * @param green value of the green channel between 0 and 255. eg: 255
     * @param blue value of the blue channel between 0 and 255. eg: 255
     */
    //% weight=1
    //% blockId="zip_rgb" block="red %red|green %green|blue %blue"
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }

    /**
     * Gets the RGB value of a known color
    */
    //% weight=2 blockGap=8
    //% blockId="zip_colors" block="%color"
    export function colors(color: ZipLedColors): number {
        return color;
    }

    function packRGB(a: number, b: number, c: number): number {
        return ((a & 0xFF) << 16) | ((b & 0xFF) << 8) | (c & 0xFF);
    }
    function unpackR(rgb: number): number {
        let r = (rgb >> 16) & 0xFF;
        return r;
    }
    function unpackG(rgb: number): number {
        let g = (rgb >> 8) & 0xFF;
        return g;
    }
    function unpackB(rgb: number): number {
        let b = (rgb) & 0xFF;
        return b;
    }

    /**
     * Converts a hue saturation luminosity value into a RGB color
     */
    function hsl(h: number, s: number, l: number): number {
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);
        
        h = h % 360;
        s = Math.clamp(0, 99, s);
        l = Math.clamp(0, 99, l);
        let c = Math.idiv((((100 - Math.abs(2 * l - 100)) * s) << 8), 10000); //chroma, [0,255]
        let h1 = Math.idiv(h, 60);//[0,6]
        let h2 = Math.idiv((h - h1 * 60) * 256, 60);//[0,255]
        let temp = Math.abs((((h1 % 2) << 8) + h2) - 256);
        let x = (c * (256 - (temp))) >> 8;//[0,255], second largest component of this color
        let r$: number;
        let g$: number;
        let b$: number;
        if (h1 == 0) {
            r$ = c; g$ = x; b$ = 0;
        } else if (h1 == 1) {
            r$ = x; g$ = c; b$ = 0;
        } else if (h1 == 2) {
            r$ = 0; g$ = c; b$ = x;
        } else if (h1 == 3) {
            r$ = 0; g$ = x; b$ = c;
        } else if (h1 == 4) {
            r$ = x; g$ = 0; b$ = c;
        } else if (h1 == 5) {
            r$ = c; g$ = 0; b$ = x;
        }
        let m = Math.idiv((Math.idiv((l * 2 << 8), 100) - c), 2);
        let r = r$ + m;
        let g = g$ + m;
        let b = b$ + m;
        return packRGB(r, g, b);
    }

    export enum HueInterpolationDirection {
        Clockwise,
        CounterClockwise,
        Shortest
    }
} 