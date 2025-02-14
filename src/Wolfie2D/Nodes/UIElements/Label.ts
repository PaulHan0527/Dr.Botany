import Vec2 from "../../DataTypes/Vec2";
import TweenController from "../../Rendering/Animations/TweenController";
import Color from "../../Utils/Color";
import UIElement from "../UIElement";

/** A basic text-containing label */
export default class Label extends UIElement{
	/** The color of the text of this UIElement */
	textColor: Color;
	/** The value of the text of this UIElement */
	text: string;
	/** The name of the font */
	font: string;
	/** The size of the font */
	fontSize: number;
	/** The horizontal alignment of the text within the label */
	protected hAlign: string;
	/** The vertical alignment of text within the label */
	protected vAlign: string;

	/** A flag for if the width of the text has been measured on the canvas for auto width assignment */
	protected sizeAssigned: boolean;

	/** The initial position of the label */
	origin: Vec2;

	tweens: TweenController;

	constructor(position: Vec2, text: string, size: number = 30){
		super(position);
		this.origin = position;
		this.text = text;
		this.textColor = new Color(0, 0, 0, 1);
		this.font = "Arial";
		this.fontSize = size;
		this.hAlign = "center";
		this.vAlign = "center";

		this.sizeAssigned = false;
	}

	// @deprecated
	setText(text: string): void {
		this.text = text;
	}

	// @deprecated
	setTextColor(color: Color): void {
		this.textColor = color;
	}

	/**
	 * Gets a string containg the font details for rendering
	 * @returns A string containing the font details
	 */
	getFontString(): string {
		return this.fontSize + "px " + this.font;
	}

	/**
	 * Overridable method for calculating text color - useful for elements that want to be colored on different after certain events
	 * @returns a string containg the text color
	 */
	calculateTextColor(): string {
		return this.textColor.toStringRGBA();
	}

	/**
	 * Uses the canvas to calculate the width of the text
	 * @param ctx The rendering context
	 * @returns A number representing the rendered text width
	 */
	protected calculateTextWidth(ctx: CanvasRenderingContext2D): number {
		ctx.font = this.fontSize + "px " + this.font;
		return ctx.measureText(this.text).width;
	}

	setHAlign(align: string): void {
		this.hAlign = align;
	}

	setVAlign(align: string): void {
		this.vAlign = align;
	}

	/**
	 * Calculate the offset of the text - this is used for rendering text with different alignments
	 * @param ctx The rendering context
	 * @returns The offset of the text in a Vec2
	 */
	calculateTextOffset(ctx: CanvasRenderingContext2D): Vec2 {
		let textWidth = this.calculateTextWidth(ctx);

		let offset = new Vec2(0, 0);

		let hDiff = this.size.x - textWidth;
		if(this.hAlign === "center"){
			offset.x = hDiff/2;
		} else if (this.hAlign === "right"){
			offset.x = hDiff;
		}

		if(this.vAlign === "top"){
			ctx.textBaseline = "top";
			offset.y = 0;
		} else if (this.vAlign === "bottom"){
			ctx.textBaseline = "bottom";
			offset.y = this.size.y;
		} else {
			ctx.textBaseline = "middle";
			offset.y = this.size.y/2;
		}

		return offset;
	}

	protected sizeChanged(): void {
		super.sizeChanged();
		this.sizeAssigned = true;
	}

	/**
	 * Automatically sizes the element to the text within it
	 * @param ctx The rendering context
	 */
	protected autoSize(ctx: CanvasRenderingContext2D): void {
		let width = this.calculateTextWidth(ctx);
		let height = this.fontSize;
		this.size.set(width + this.padding.x*2, height + this.padding.y*2);
		this.sizeAssigned = true;
	}

	/**
	 * Initially assigns a size to the UIElement if none is provided
	 * @param ctx The rendering context
	 */
	handleInitialSizing(ctx: CanvasRenderingContext2D): void {
		if(!this.sizeAssigned){
			this.autoSize(ctx);
		}
	}

	/** On the next render, size this element to it's current text using its current font size */
	sizeToText(): void {
		this.sizeAssigned = false;
	}

	set textAlpha(value: number) {
		this.textColor.a = value;
	}

	set alpha(value: number) {
		this.backgroundColor.a = value;
	}

	set bgRedChannel(value: number) {
		this.backgroundColor.r = value;
	}

	set bgGreenChannel(value: number) {
		this.backgroundColor.g = value;
	}

	set bgBlueChannel(value: number) {
		this.backgroundColor.b = value;
	}

	set textSize(value: number) {
		this.fontSize = value;
	}


}

export enum LabelTweenableProperties{
	textAlpha = "textAlpha",
	bgRedChannel = "bgRedChannel",
	bgGreenChannel = "bgGreenChannel",
	bgBlueChannel = "bgBlueChannel",
	textSize = "textSize"
}