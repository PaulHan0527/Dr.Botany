import Vec2 from "../../../Wolfie2D/DataTypes/Vec2";
import Input from "../../../Wolfie2D/Input/Input";
import Graphic from "../../../Wolfie2D/Nodes/Graphic";
import { GraphicType } from "../../../Wolfie2D/Nodes/Graphics/GraphicTypes";
import Sprite from "../../../Wolfie2D/Nodes/Sprites/Sprite";
import UIElement from "../../../Wolfie2D/Nodes/UIElement";
import Button from "../../../Wolfie2D/Nodes/UIElements/Button";
import { UIElementType } from "../../../Wolfie2D/Nodes/UIElements/UIElementTypes";
import Layer from "../../../Wolfie2D/Scene/Layer";
import Scene from "../../../Wolfie2D/Scene/Scene";
import Color from "../../../Wolfie2D/Utils/Color";
import { UILayers, ButtonNames, InGameUILayers, InGame_Events, InGame_GUI_Events, Fonts } from "../../Utils/Enums";
import UILayer from "../../../Wolfie2D/Scene/Layers/UILayer";
import Viewport from "../../../Wolfie2D/SceneGraph/Viewport";
import Label from "../../../Wolfie2D/Nodes/UIElements/Label";
import * as Palette from "../../Utils/Colors";
import * as Tweens from "../../Utils/Tweens";
import HealthBar from "./HealthBar";
import EquipSlots from "./EquipSlot";
import MoodBar from "./MoodBar";
import MaterialSlot from "./MaterialSlot";
import Updateable from "../../../Wolfie2D/DataTypes/Interfaces/Updateable";
import Receiver from "../../../Wolfie2D/Events/Receiver"
import MathUtils from "../../../Wolfie2D/Utils/MathUtils";
import GrowthBar from "./GrowthBar";

export default class InGameUI implements Updateable {
    layer: Layer; 
    scene: Scene;
    center: Vec2;
    viewport: Viewport;
    font: string; 

    healthBar: HealthBar;
    moodBar: MoodBar;
    // growthBar: GrowthBar;
    equipSlots: EquipSlots;
    materialSlots: Array<MaterialSlot> = []; // [0] == upper  [1] == downer
    materialSpriteIds: Array<string> = ["upper", "downer"];
    receiver: Receiver;
    interactLabel: Label; 
    showingInteract: boolean;


    // temporary for testing
    growthBarOutline: Sprite;
    growthBarFill: Sprite;
    showingGrowth: boolean = false;
    // 
    constructor(scene: Scene, center: Vec2, font: string, viewport: Viewport){
        this.scene = scene; 
        this.font = font; 
        this.center = center; 
        this.viewport = viewport
        this.receiver = new Receiver();

        this.layer = scene.addUILayer(UILayers.INGAME_UI);

        this.healthBar = new HealthBar(scene, center);
        this.moodBar = new MoodBar(scene, center)
        this.equipSlots = new EquipSlots(scene, center);
        let xOffset = this.center.x;
        this.showingInteract = false;
        for(let i = 0; i < 2; i ++) {
            this.materialSlots.push(new MaterialSlot(scene, center, xOffset, this.materialSpriteIds[i]));
            xOffset += 32;
        }

        this.growthBarFill = this.scene.add.sprite('growth_bar_fill', InGameUILayers.ANNOUNCEMENT_TEXT);
        this.growthBarOutline = this.scene.add.sprite('growth_bar_outline', InGameUILayers.ANNOUNCEMENT_TEXT);

        this.growthBarFill.tweens.add('scaleIn', Tweens.scaleIn(new Vec2(0,0) , new Vec2(1,1),  0, 200));
        this.growthBarFill.tweens.add('scaleOut', Tweens.scaleIn(new Vec2(1,1) , new Vec2(0,0),  0, 200));

        this.growthBarOutline.tweens.add('scaleIn', Tweens.scaleIn(new Vec2(0,0) , new Vec2(1,1),  0, 200));
        this.growthBarOutline.tweens.add('scaleOut', Tweens.scaleIn(new Vec2(1,1) , new Vec2(0,0),  0, 200));

        //subscribe to events
        this.receiver.subscribe([
            InGame_GUI_Events.INCREMENT_UPPER_COUNT,
            InGame_GUI_Events.INCREMENT_DOWNER_COUNT,
            InGame_Events.MOOD_CHANGED,
            InGame_GUI_Events.CLEAR_UPPER_LABEL,
            InGame_GUI_Events.CLEAR_DOWNER_LABEL,
            InGame_GUI_Events.UPDATE_HEALTHBAR,
            InGame_GUI_Events.SHOW_INTERACT_LABEL,
            InGame_GUI_Events. HIDE_INTERACT_LABEL,
            InGame_GUI_Events.UPDATE_EQUIP_SLOT,
            InGame_GUI_Events.SHOW_GROWTH_BAR,
            InGame_GUI_Events.HIDE_GROWTH_BAR,
            InGame_GUI_Events.UPDATE_EQUIP_SLOT_OUTLINE,
            InGame_GUI_Events.UPDATE_EQUIP_SLOT_AMMO
        ]);

    }

    reposition(width: number, height: number) : void {
        this.moodBar.updatePos(width, height);
    }

    update(deltaT:number){
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent();
            let announce = false;
            let position = new Vec2(0,0);
            let announceText = '';
            let color;
            if(event.type === InGame_Events.MOOD_CHANGED){
                let moodLevel = event.data.get('moodChange');
                let newPos = (-10*moodLevel / (this.moodBar.sprite.size.x/16)) +  this.moodBar.indicator.position.x;
                newPos = MathUtils.clamp(newPos, this.moodBar.centerPos.x - this.moodBar.sprite.size.x / 2, this.moodBar.centerPos.x + this.moodBar.sprite.size.x / 2)
                this.moodBar.indicator.tweens.add("slideX", Tweens.indicatorSlideX(this.moodBar.indicator.position.x, newPos));   
                this.moodBar.indicator.scale.x += 1;     
                this.moodBar.indicator.tweens.add("scale", Tweens.indicatorScaleUpDown(this.moodBar.indicator.scale));        
                this.moodBar.indicator.tweens.play("slideX");        
                this.moodBar.indicator.tweens.play("scale");        
            }

            if(event.type === InGame_GUI_Events.SHOW_GROWTH_BAR){
                if(!this.showingGrowth) {
                    this.showingGrowth = true;
                    position = event.data.get("position");
                    this.growthBarFill.position.set(position.x, position.y - 48);
                    this.growthBarOutline.position.set(position.x, position.y - 48);
                    // this.growthBarFill.tweens.add("fadeIn", Tweens.spriteFadeIn(200));
                    // this.growthBarOutline.tweens.add("fadeIn", Tweens.spriteFadeIn(200));
                    // this.growthBarFill.tweens.add("fadeOut", Tweens.spriteFadeOut(200));
                    // this.growthBarOutline.tweens.add("fadeOut", Tweens.spriteFadeOut(200));
                    this.growthBarFill.tweens.play("scaleIn");
                    this.growthBarOutline.tweens.play("scaleIn");
                }

            }

            if(event.type === InGame_GUI_Events.HIDE_GROWTH_BAR){
                this.growthBarFill.tweens.play("scaleOut");
                this.growthBarOutline.tweens.play("scaleOut");
                this.showingGrowth = false;
            }

            if(event.type === InGame_GUI_Events.UPDATE_HEALTHBAR){
                this.healthBar.takeDamage();
            }
            if(event.type === InGame_GUI_Events.SHOW_INTERACT_LABEL){
                position = event.data.get("position");
                this.interactLabel = <Label>this.scene.add.uiElement(UIElementType.LABEL, InGameUILayers.ANNOUNCEMENT_TEXT, {position: new Vec2(position.x, position.y-16), text:"E"});
                this.interactLabel.font = Fonts.ABBADON_LIGHT;
                this.interactLabel.textColor = Palette.white();
                this.interactLabel.fontSize = 0;
                this.interactLabel.scale = Vec2.ZERO;
                this.interactLabel.tweens.add("scaleTextIn", Tweens.scaleInText(48, 0, 100));
                this.interactLabel.tweens.add("scaleTextOut", Tweens.scaleOutText(48, 0, 100));
                this.showingInteract = true;
                this.interactLabel.tweens.play("scaleTextIn");
            }

            if(event.type === InGame_GUI_Events.HIDE_INTERACT_LABEL){
                if(this.interactLabel && this.showingInteract) {
                    this.showingInteract = false;
                    this.interactLabel.tweens.play("scaleTextOut");
                }

            }
            if(event.type === InGame_GUI_Events.UPDATE_EQUIP_SLOT_AMMO){ 
                let spriteKey = event.data.get("spriteKey");
                let ammo = event.data.get("ammo");
                this.equipSlots.updateCounter(spriteKey, ammo);
            }

            

            if(event.type === InGame_GUI_Events.UPDATE_EQUIP_SLOT){ 
                let spriteKey = event.data.get("spriteKey");
                let ammo = event.data.get("ammo");
                let hasAmmo = event.data.get("hasAmmo");
                this.equipSlots.updateSlot(spriteKey, hasAmmo, ammo);
            }

            if(event.type === InGame_GUI_Events.UPDATE_EQUIP_SLOT_OUTLINE){ 
                let spriteKey = event.data.get("spriteKey");
                this.equipSlots.drawOutline(spriteKey);
            }


            if(event.type === InGame_GUI_Events.CLEAR_UPPER_LABEL){
                position = event.data.get("position");
                announceText = `-${this.materialSlots[0].count} uppers`
                announce = true;
                color = Palette.red()
                this.materialSlots[0].clearCount()
            }

            if(event.type === InGame_GUI_Events.CLEAR_DOWNER_LABEL){
                position = event.data.get("position");
                announceText = `-${this.materialSlots[1].count} downers`
                announce = true;
                color = Palette.red()
                this.materialSlots[1].clearCount()

            }
            if(event.type === InGame_GUI_Events.INCREMENT_UPPER_COUNT){
                position = event.data.get("position");
                this.materialSlots[0].updateCount()
                announceText = '+1 Upper'
                color = Palette.white()
                announce = true;
                
            }

            if(event.type === InGame_GUI_Events.INCREMENT_DOWNER_COUNT){
                position = event.data.get("position");
                this.materialSlots[1].updateCount()
                announceText = '+1 Downer'
                color = Palette.white()
                announce = true;
            }
            if(announce) {
                let announceLabelBackdrop = <Label>this.scene.add.uiElement(UIElementType.LABEL, InGameUILayers.ANNOUNCEMENT_BACKDROP, {position: new Vec2(position.x + 0.5, position.y + 0.5), text:announceText});
                announceLabelBackdrop.font = Fonts.ROUND;
                announceLabelBackdrop.textColor = Palette.black();
                announceLabelBackdrop.fontSize = 26;
                announceLabelBackdrop.tweens.add("announce", Tweens.announce(position.x -32, 32.5))
                

                let announceLabel = <Label>this.scene.add.uiElement(UIElementType.LABEL, InGameUILayers.ANNOUNCEMENT_TEXT, {position: new Vec2(position.x , position.y), text:announceText});
                announceLabel.font = Fonts.ROUND;
                announceLabel.textColor = color;
                announceLabel.fontSize = 26;
                announceLabel.tweens.add("announce", Tweens.announce(position.x - 32, 32));
                announceLabelBackdrop.tweens.play("announce");
                announceLabel.tweens.play("announce");
                setTimeout(() => {
                    announceLabel.destroy();
                    announceLabelBackdrop.destroy();
                }, 500);
                
            }
        }
    }
 
}