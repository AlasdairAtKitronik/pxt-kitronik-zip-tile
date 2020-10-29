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
        //% block="Up"
        Up
    }

    /**
     * Different configurations for micro:bit location in a multi-tile display
     * Use standard for a single tile
     */
    export enum UBitLocations {
        //% block="Hidden"
        Hidden,
        //% block="Visible"
        Visible
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
        _matrixWidth: number;
        _matrixHeight: number;
        _uBitLocation: UBitLocations;

        /**
         * Shows a rainbow pattern on all LEDs. 
         * @param startHue the start hue value for the rainbow, eg: 1
         * @param endHue the end hue value for the rainbow, eg: 360
         */
        //% blockId="kitronik_set_zip_tile_rainbow" block="%tileDisplay|show rainbow from %startHue|to %endHue" 
        //% weight=94 blockGap=8
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
        //% blockId="kitronik_zip_tile_display_rotate" block="%tileDisplay|rotate ZIP LEDs by %offset" blockGap=8
        //% weight=93
        rotate(offset: number = 1): void {
            this.buf.rotate(-offset * 3, this.start * 3, this._length * 3)
        }

        /**
         * Shows whole ZIP Tile display as a given color (range 0-255 for r, g, b). 
         * @param rgb RGB color of the LED
         */
        //% blockId="kitronik_zip_tile_display_set_strip_color" block="%tileDisplay|show color %rgb=zip_colors" 
        //% weight=99 blockGap=8
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
        //% blockId="kitronik_zip_tile_display_set_matrix_color" block="%tileDisplay|set matrix color at x %x|y %y|to %rgb=zip_colors" 
        //% weight=98
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
            //If statement checks the tile arrangement: 1 row of tiles (inc. single tile), 2 tiles connected top to top, or a 2 x 2 arrangement
            if (ROWS == 8) {
                switch (this._uBitLocation) {
                    case UBitLocations.Hidden:
                        //The first part of the equation is the equivalent of (x+8y) on the normal matrix starting 0, 0 in top left
                        i = (x + 8 * y) + (floorX * (LEDS_ON_PANEL - 8))
                        break
                    case UBitLocations.Visible:
                        i = (((COLUMNS/8)*LEDS_ON_PANEL)-1) - (x + 8 * y) - (floorX * (LEDS_ON_PANEL - 8))
                        break
                }
            }
            else if (COLUMNS == 8) {
                if (this._uBitLocation == UBitLocations.Visible) {
                    if (y < 8) {
                        currentPanel = 1
                    }
                    else {
                        currentPanel = 2
                    }
                }
                else if (this._uBitLocation == UBitLocations.Hidden) {
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
                switch (this._uBitLocation) {
                    case UBitLocations.Hidden:
                        //The first part of the equation is the equivalent of (x+8y) on the normal matrix starting 0, 0 in top left
                        i = (-255 * (floorY - 1)) + (2 * floorY - 1) * (x + 8 * (y - floorY * 8)) + (floorY * floorX * (LEDS_ON_PANEL - 8)) + (floorY - 1) * (floorX * (LEDS_ON_PANEL - 8))
                        break
                    case UBitLocations.Visible:
                        i = i = (-255 * (floorY - 1)) + (2 * floorY - 1) * (x + 8 * (y - floorY * 8)) + (floorY * floorX * (LEDS_ON_PANEL - 8)) + (floorY - 1) * (floorX * (LEDS_ON_PANEL - 8)) - 128 + (floorY * 256)
                        break
                }
            }
            this.setPixelColor(i, rgb)
        }

        /**
         * Scroll text across tile (select direction, speed & colour)
         * @param text is the text to scroll
         * @param direction the text will travel
         * @param delay the pause time between each display refresh, eg: 25
         * @param style extra formatting of the text (such as underlined)
         * @param rgb RGB color of the text
         * @param formatRGB RGB color of the text
         */
        //% blockId="kitronik_zip_tile_scroll_text" block="%tileDisplay|scroll %text|%direction|delay (ms) %delay|formatting %style|format colour %formatRGB=zip_colors|text colour %rgb=zip_colors" 
        //% weight=97
        scrollText(text: string, direction: TextDirection, delay: number, style: TextStyle, formatRGB: number, rgb: number) {
            let LEDS_ON_PANEL = 64
            let COLUMNS = this._matrixWidth
            let ROWS = this._matrixHeight
            let totalPanels = (this._length/LEDS_ON_PANEL)
            let textBrightness = this.brightness
            let backBrightness = textBrightness/6
            let lineColOffset = 0
            let centreOffsetH = 0 //Horizontal centre offset
            let centreOffsetV = 0 //Vertical centre offset
            let currentPanel = 0
            let textLength = 0 //This is really the width in individual pixels, calculated in next step if direction = LEFT
            let textHeight = 0 //Height in individual pixels, calculated in next step if direction = UP
            let textChar = 0

            if (COLUMNS > 8) {
                centreOffsetH = (COLUMNS/2) - 4
            }

            if (ROWS > 8) {
                centreOffsetV = (ROWS/2) - 4
            }

            switch (direction) {
                case TextDirection.Up:
                    for (textChar = 0; textChar < text.length; textChar++) {
                        textHeight += 6
                    }
                    /////////////////////////////////////////////////////////
                    //Setup for static text display TO DO                  //
                    //if (textHeight <= ROWS) {                            //
                    //    //Make text static display for set length of time//
                    //    break                                            //
                    //}                                                    //
                    /////////////////////////////////////////////////////////
                    for (let row = 0; row < textHeight + ROWS; row ++) {
                        this.clear()
                        if (style == TextStyle.Background) {
                            this.brightness = backBrightness
                            this.showColor(formatRGB)
                        }
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
                                        let floorX = Math.floor((2 + c_col + centreOffsetH)/8)
                                        if (ROWS > 8 && COLUMNS <= 8) {
                                            if (this._uBitLocation == UBitLocations.Hidden) {
                                                if (yValue < 8) {
                                                    currentPanel = 2
                                                }
                                                else {
                                                    currentPanel = 1
                                                }
                                            }
                                            else if (this._uBitLocation == UBitLocations.Visible) {
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
                                            }
                                        }
                                        else if (ROWS <= 8) {
                                            if (yValue < ROWS && yValue >= 0) {
                                                let i = 0
                                                switch (this._uBitLocation) {
                                                    case UBitLocations.Hidden:
                                                        //The first part of the equation is the equivalent of (x+8y) on the normal matrix starting 0, 0 in top left
                                                        i = ((2 + c_col + centreOffsetH) + (8 * yValue)) + (floorX * (LEDS_ON_PANEL - 8))
                                                        break
                                                    case UBitLocations.Visible:
                                                        i = (((COLUMNS/8)*LEDS_ON_PANEL)-1) - ((2 + c_col + centreOffsetH) + (8 * yValue)) - (floorX * (LEDS_ON_PANEL - 8))
                                                        break
                                                }
                                                this.setPixelColor(i, rgb)
                                            }
                                        }
                                        else if (COLUMNS == 16 && ROWS == 16) {
                                            if (yValue < ROWS && yValue >= 0) {
                                                let i = 0
                                                switch (this._uBitLocation) {
                                                    case UBitLocations.Hidden:
                                                        //The first part of the equation is the equivalent of (x+8y) on the normal matrix starting 0, 0 in top left
                                                        i = (-255 * (floorY - 1)) + (2 * floorY - 1) * (((2 + c_col + centreOffsetH) + 8 * (yValue - floorY * 8)) + floorX * (LEDS_ON_PANEL - 8))
                                                        break
                                                    case UBitLocations.Visible:
                                                        i = (-255 * (floorY - 1)) + (2 * floorY - 1) * (((2 + c_col + centreOffsetH) + 8 * (yValue - floorY * 8)) + floorX * (LEDS_ON_PANEL - 8)) - 128 + (floorY * 256)
                                                        break
                                                }
                                                this.setPixelColor(i, rgb)
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
                    /////////////////////////////////////////////////////////////////////////////////////////////////////
                    //Setup for static text display TO DO                                                              //
                    //if (textLength <= COLUMNS) {                                                                     //
                    //    //Make text static display for set length of time                                            //
                    //    for (let column = 0; column < COLUMNS; column++) {                                           //
                    //        for (let stringLength = 0; stringLength < text.length; stringLength++) {                 //
                    //            this.brightness = textBrightness                                                     //
                    //            let width = charWidth(text.charAt(stringLength))                                     //
                    //            let textData: Buffer = getChar(text.charAt(stringLength))                            //
                    //            for (let c_row = 0; c_row < 5; c_row++) {                                            //
                    //                for (let c_col = 0; c_col < 5; c_col++) {                                        //
                    //                    if ((textData[c_row] & (1 << (4 - c_col))) > 0) {                            //
                    //                        let xValue = COLUMNS + c_col                                             //
                    //                        let xDiv = xValue / 8                                                    //
                    //                        let floorX = Math.floor(xDiv)                                            //
                    //                        if (xValue < COLUMNS && xValue >= 0) {                                   //
                    //                            let i = (xValue + ((2 + c_row) * 8)) + (floorX * (LEDS_ON_PANEL - 8))//
                    //                            this.setPixelColor(i, rgb)                                           //
                    //                        }                                                                        //
                    //                    }                                                                            //
                    //                }                                                                                //
                    //            }                                                                                    //
                    //        }                                                                                        //
                    //    }                                                                                            //
                    //    this.show()                                                                                  //
                    //    break                                                                                        //
                    //}                                                                                                //
                    /////////////////////////////////////////////////////////////////////////////////////////////////////
                    for (let column = 0; column < textLength + COLUMNS; column++) {
                        this.clear()
                        if (style == TextStyle.Background) {
                            this.brightness = backBrightness
                            this.showColor(formatRGB)
                        }
                        if (style == TextStyle.Underlined) {
                            let lineCol = COLUMNS - column - 1
                            let floorLineCol = Math.floor(lineCol / 8)
                            let floorY = Math.floor((7 + centreOffsetV)/8)
                            let lineLED = 0
                            if (COLUMNS == 16 && ROWS == 16) {
                                switch (this._uBitLocation) {
                                    case UBitLocations.Hidden:
                                        //The first part of the equation is the equivalent of (x+8y) on the normal matrix starting 0, 0 in top left
                                        lineLED = (-255 * (floorY - 1)) + (2 * floorY - 1) * ((lineCol + 8 * ((7 + centreOffsetV) - floorY * 8)) + floorLineCol * (LEDS_ON_PANEL - 8))
                                        break
                                    case UBitLocations.Visible:
                                        lineLED = (-255 * (floorY - 1)) + (2 * floorY - 1) * ((lineCol + 8 * ((7 + centreOffsetV) - floorY * 8)) + floorLineCol * (LEDS_ON_PANEL - 8)) - 128 + (floorY * 256)
                                        break
                                }
                            }
                            else {
                                switch (this._uBitLocation) {
                                    case UBitLocations.Hidden:
                                        lineLED = lineCol + (7 * 8) + (floorLineCol * (LEDS_ON_PANEL - 8))
                                        break
                                    case UBitLocations.Visible:
                                        lineLED = (((COLUMNS/8)*LEDS_ON_PANEL)-1) - (lineCol + (7 * 8)) - (floorLineCol * (LEDS_ON_PANEL - 8))
                                        break
                                }
                            }
                            this.setPixelColor(lineLED, formatRGB)
                            
                            for (let extraLineCol = lineCol; extraLineCol < COLUMNS; extraLineCol ++) {
                                if (extraLineCol < 0 || extraLineCol > COLUMNS) {
                                    continue
                                }
                                let floorExtraLineCol = Math.floor(extraLineCol / 8)
                                let floorY = Math.floor((7 + centreOffsetV)/8)
                                let extraLineLED = 0
                                if (COLUMNS == 16 && ROWS == 16) {
                                    switch (this._uBitLocation) {
                                        case UBitLocations.Hidden:
                                            //The first part of the equation is the equivalent of (x+8y) on the normal matrix starting 0, 0 in top left
                                            extraLineLED = (-255 * (floorY - 1)) + (2 * floorY - 1) * ((extraLineCol + 8 * ((7 + centreOffsetV) - floorY * 8)) + floorExtraLineCol * (LEDS_ON_PANEL - 8))
                                            break
                                        case UBitLocations.Visible:
                                            extraLineLED = (-255 * (floorY - 1)) + (2 * floorY - 1) * ((extraLineCol + 8 * ((7 + centreOffsetV) - floorY * 8)) + floorExtraLineCol * (LEDS_ON_PANEL - 8)) - 128 + (floorY * 256)
                                            break
                                    }
                                }
                                else {
                                    switch (this._uBitLocation) {
                                        case UBitLocations.Hidden:
                                            extraLineLED = extraLineCol + (7 * 8) + (floorExtraLineCol * (LEDS_ON_PANEL - 8))
                                            break
                                        case UBitLocations.Visible:
                                            extraLineLED = (((COLUMNS/8)*LEDS_ON_PANEL)-1) - (extraLineCol + (7 * 8)) - (floorExtraLineCol * (LEDS_ON_PANEL - 8))
                                            break
                                    }
                                }
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
                                        let floorY = Math.floor((2 + c_row + centreOffsetV)/8)
                                        if (xValue < COLUMNS && xValue >= 0) {
                                            let i = 0
                                            if (COLUMNS == 16 && ROWS == 16) {
                                                switch (this._uBitLocation) {
                                                    case UBitLocations.Hidden:
                                                        //The first part of the equation is the equivalent of (x+8y) on the normal matrix starting 0, 0 in top left
                                                        i = (-255 * (floorY - 1)) + (2 * floorY - 1) * ((xValue + 8 * ((2 + c_row + centreOffsetV) - floorY * 8)) + floorX * (LEDS_ON_PANEL - 8))
                                                        break
                                                    case UBitLocations.Visible:
                                                        i = (-255 * (floorY - 1)) + (2 * floorY - 1) * ((xValue + 8 * ((2 + c_row + centreOffsetV) - floorY * 8)) + floorX * (LEDS_ON_PANEL - 8)) - 128 + (floorY * 256)
                                                        break
                                                }
                                            }
                                            else {
                                                switch (this._uBitLocation) {
                                                    case UBitLocations.Hidden:
                                                        //The first part of the equation is the equivalent of (x+8y) on the normal matrix starting 0, 0 in top left
                                                        i = (xValue + ((2 + c_row) * 8)) + (floorX * (LEDS_ON_PANEL - 8))
                                                        break
                                                    case UBitLocations.Visible:
                                                        i = (((COLUMNS/8)*LEDS_ON_PANEL)-1) - (xValue + ((2 + c_row) * 8)) - (floorX * (LEDS_ON_PANEL - 8))
                                                        break
                                                }
                                            }
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
        //% blockId="kitronik_zip_tile_display_show" block="%tileDisplay|show" blockGap=8
        //% weight=96
        show() {
            //ws2812b.sendBuffer(this.buf, this.pin, this.brightness);
            // Use the pxt-microbit core version which now respects brightness (10/2020)
            light.sendWS2812BufferWithBrightness(this.buf, this.pin, this.brightness);
        }

        /**
         * Turn off all LEDs on the ZIP Tile display.
         * You need to call ``show`` to make the changes visible.
         */
        //% blockId="kitronik_zip_tile_display_clear" block="%tileDisplay|clear"
        //% weight=95
        clear(): void {
            this.buf.fill(0, this.start * 3, this._length * 3);
        }

        /**
         * Set the brightness of the ZIP Tile display. This flag only applies to future operation.
         * @param brightness a measure of LED brightness in 0-255. eg: 255
         */
        //% blockId="kitronik_zip_tile_display_set_brightness" block="%tileDisplay|set brightness %brightness" blockGap=8
        //% weight=92
        setBrightness(brightness: number): void {
            //Clamp incoming variable at 0-255 Math.clamp didnt work...
            if(brightness <0)
            {
              brightness = 0
            }
            else if (brightness > 255)
            {
              brightness = 255
            }
            this.brightness = brightness & 0xff;
            basic.pause(1) //add a pause to stop weirdnesses
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
            this.buf[offset + 0] = green;
            this.buf[offset + 1] = red;
            this.buf[offset + 2] = blue;
        }

        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const end = this.start + this._length;
            for (let i = this.start; i < end; ++i) {
                this.setBufferRGB(i * 3, red, green, blue)
            }
        }
        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            pixeloffset = (pixeloffset + this.start) * 3;

            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            this.setBufferRGB(pixeloffset, red, green, blue)
        }
    }

    /**
     * Create a new ZIP LED driver for ZIP Tile Display.
     * @param hArrange the number of ZIP Tiles connected connected horizontally, eg: 1
     * @param vArrange the number of ZIP Tiles connected vertically, eg: 1
     * @param uBitConfig postion of the microbit in the display (for a single tile, leave as 'Standard')
     */
    //% blockId="kitronik_zip_tile_display_create" block="Horizontal Tiles: %hArrange|Vertical Tiles: %vArrange|uBit location: %uBitConfig"
    //% weight=100 blockGap=8
    //% trackArgs=0,2
    //% blockSetVariable=tileDisplay
    export function createZIPTileDisplay(hArrange: number, vArrange: number, uBitConfig: UBitLocations): ZIPTileDisplay {
        let tileDisplay = new ZIPTileDisplay();
        tileDisplay.buf = pins.createBuffer((hArrange * vArrange * 64) * 3);
        tileDisplay.start = 0;
        tileDisplay._length = (hArrange * vArrange * 64);
        tileDisplay._matrixWidth = (hArrange*8);
        tileDisplay._matrixHeight = (vArrange*8);
        tileDisplay._uBitLocation = uBitConfig;
        tileDisplay.setBrightness(255)
        tileDisplay.setPin(DigitalPin.P1)
        return tileDisplay;
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