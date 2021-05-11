import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import Label from "../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Scene from "../../Wolfie2D/Scene/Scene";
import { Fonts, InGameUILayers } from "../Utils/Enums";

export default class AnimatedDialog {
	fullString: string = '';
	fullLen: number;
	revealedLen: number = 0;
	currentString: string = '';
	intervalTime: number = 4; // ms
	elapsedTime: number = 0 ;
	label: Label;
	position: Vec2;
	scene: Scene;
	finished: boolean = false;
	bg: Sprite;
	// note make intervalTime a constructor arg to have variable wait time, so that sentences are fast and then maybe ellipses are slower
	constructor(fullString: string, position: Vec2, scene: Scene) {
		this.fullString = fullString;
		this.fullLen = fullString.length;
		this.currentString = '';
		this.position = position;
		this.scene = scene;

		this.label = <Label>this.scene.add.uiElement(UIElementType.LABEL, InGameUILayers.ANNOUNCEMENT_TEXT, {position: new Vec2(position.x, position.y), text: this.currentString});
		this.label.setHAlign('left')
		this.label.font = Fonts.ABBADON_BOLD

	}

	start(): void {
		this.label.visible = true;
		this.finished = false;
		this.currentString = '';
		this.label.text = this.currentString;
		this.revealedLen = 0;
		this.elapsedTime = 0;
	}

	incrementText(): void {
		// emit textwrite sfx
		if(this.elapsedTime % this.intervalTime === 0) {
			// dirty fix for double first char
			let nextChar = this.fullString[this.revealedLen];
			this.revealedLen++;
			if(this.fullString[this.revealedLen] === ' ') {
				nextChar = nextChar + this.fullString[this.revealedLen];
				this.revealedLen++;
			} 
			this.currentString = this.currentString + nextChar;
			this.label.text = this.currentString;
			if(this.revealedLen === this.fullLen) {
				// maybe a better way would be to subscribe to an event while an animated dialog is playing and then unsub when finished

				this.finish();
			}
		}
		
		this.elapsedTime ++;
	}

	finish(): void {
		this.finished = true;

	}


}