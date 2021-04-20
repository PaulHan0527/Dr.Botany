import Vec2 from "../../../Wolfie2D/DataTypes/Vec2";
import Sprite from "../../../Wolfie2D/Nodes/Sprites/Sprite";
import Label from "../../../Wolfie2D/Nodes/UIElements/Label";
import { UIElementType } from "../../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Scene from "../../../Wolfie2D/Scene/Scene";
import { UILayers, Fonts } from "../../Utils/Enums";
import * as Palette from "../../Utils/Colors";
export default class HealthBar {
    sprite: Sprite;
    spriteOutline: Sprite; 
	text: Label;
	textBackdrop: Label;
    centerPos: Vec2;
    health: number = 100; 

	constructor(scene: Scene, centerPos: Vec2) {
		this.centerPos = centerPos;
        this.spriteOutline = scene.add.sprite("healthbaroutline", UILayers.INGAME_UI)
        this.sprite = scene.add.sprite("healthbar", UILayers.INGAME_UI)

        let xOffset =  this.sprite.size.x / 5;
        let yOffset =  this.centerPos.y / 9;
        this.sprite.position.set(xOffset, yOffset)
        this.spriteOutline.position.set(xOffset,yOffset)

        this.sprite.scale = new Vec2(0.5, 0.5);
        this.spriteOutline.scale = new Vec2(0.5,0.5);
        this.textBackdrop = <Label>scene.add.uiElement(UIElementType.LABEL, UILayers.INGAME_UI, {position: new Vec2(xOffset+0.5, yOffset + 0.5), text:'HP: ' + this.health + '%'});
        this.textBackdrop.size = this.sprite.size;
        this.textBackdrop.font = Fonts.ROUND;
        this.textBackdrop.textColor = Palette.black();
        this.textBackdrop.fontSize = 24;

		this.text = <Label>scene.add.uiElement(UIElementType.LABEL, UILayers.INGAME_UI, {position: new Vec2(xOffset, yOffset), text:'HP: ' + this.health + '%'});
        this.text.size = this.sprite.size;
        this.text.font = Fonts.ROUND;
        this.text.textColor = Palette.white();
        this.text.fontSize = 24;
	}

	updateText(damageTaken: number): void {
        // TODO: when player health changes, text has to update
        this.health = this.health - damageTaken; 
        this.textBackdrop.text = 'HP: ' + this.health + '%';
        this.text.text = 'HP: ' + this.health + '%';
	}

}