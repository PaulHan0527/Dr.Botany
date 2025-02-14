import StateMachineAI from "../../Wolfie2D/AI/StateMachineAI";
import AABB from "../../Wolfie2D/DataTypes/Shapes/AABB";
import Vec2 from "../../Wolfie2D/DataTypes/Vec2";
import GameEvent from "../../Wolfie2D/Events/GameEvent";
import { GameEventType } from "../../Wolfie2D/Events/GameEventType";
import Input from "../../Wolfie2D/Input/Input";
import AnimatedSprite from "../../Wolfie2D/Nodes/Sprites/AnimatedSprite";
import Sprite from "../../Wolfie2D/Nodes/Sprites/Sprite";
import Viewport from "../../Wolfie2D/SceneGraph/Viewport";
import Timer from "../../Wolfie2D/Timing/Timer";
import EnemyController from "../Enemies/EnemyController";
import EquipmentManager from "../GameSystems/EquipmentManager";
import Equipment from "../Types/items/Equipment";
import { InGame_Events, InGame_GUI_Events, WeaponTypes } from "../Utils/Enums";
import { PhysicsGroups } from "../Utils/PhysicsOptions";
import * as Tweens from "../Utils/Tweens"
import BattlerAI from "./BattlerAI";

export default class PlayerController extends StateMachineAI implements BattlerAI {
    health: number;
    owner: AnimatedSprite;
    equipment: Array<Equipment> = [];
    equipmentManager: EquipmentManager;
    plant: AnimatedSprite; 

    direction: Vec2;
    speed: number;
    velocity: Vec2 = new Vec2(0, 0);

    equipped: Equipment;
    stowed: Equipment;
    placeholderEquip: Equipment;
    onCooldown: boolean = false;
    coolDownTimer: Timer;
    hitTimer: Timer;
    downerCount: number = 0;
    upperCount: number = 0;
    canDepositUpper: boolean = false;
    canDepositDowner: boolean = false;
    knockBack: boolean = false;
    knockBackVel: Vec2 = new Vec2(0, 0);

    viewport: Viewport;
    shadowOffset: Vec2 = new Vec2(0, 10);
    levelView: Viewport;
    viewHalfSize: Vec2;
    playerLookDirection: Vec2 = new Vec2(0, 0);
    damaged: boolean = false;
    damageCooldown: number;
    damageTaken: number = 1;
    hitFlashCooldown: number;
    pauseExecution: boolean = false;
    gameOver: boolean = false;
    nearEquip: number = -1;
    nearUpperDeposit: number = -1;
    nearDownerDeposit: number = -1;
    invulnerable: boolean = false;

    initializeAI(owner: AnimatedSprite, options: Record<string, any>): void {
        this.owner = owner;
        this.viewport = owner.getScene().getViewport();
        this.equipmentManager = options.equipmentManager;
        this.plant = options.plant; 

        this.direction = Vec2.ZERO;
        this.speed = options.speed;
        this.health = 8;
        this.levelView = this.owner.getScene().getViewport();
        this.viewHalfSize = this.levelView.getHalfSize();

        this.owner.scale = new Vec2(1.5, 1.5);
        this.owner.tweens.add('squish', Tweens.squish(this.owner.scale.clone()));
        this.owner.tweens.add('hit', Tweens.playerHit(this.owner.alpha));

        this.owner.position.set(options.mapSize.x / 2, options.mapSize.y / 2);


        this.owner.addPhysics(new AABB(Vec2.ZERO, new Vec2(7, 2)));
        this.owner.colliderOffset.set(0, 10);
        this.owner.setGroup(PhysicsGroups.PLAYER);

        this.equipped = (<EquipmentManager>options.equipmentManager).pickupEquipped("Shovel");
        this.placeholderEquip = new Equipment({})
        this.stowed = this.placeholderEquip;
        this.initEquip();



        this.hitTimer = new Timer(300, () => {
            this.owner.alpha = 1;

        });

        this.subscribeToEvents();


    }
    initEquip(): void {
        let hasAmmo = this.equipped.type === WeaponTypes.AMMO ? true : false;
        let ammo = 1;
        if (hasAmmo) {
            ammo = this.equipped.charges;
        }

        let slotData = [{ spriteKey: this.equipped.iconSpriteKey, hasAmmo: hasAmmo, ammo: ammo }];
        if (this.stowed.type !== undefined) {
            let hasAmmo = this.stowed.type === WeaponTypes.AMMO ? true : false;
            let ammo = 1;
            if (hasAmmo) {
                ammo = this.stowed.charges;
            }
            slotData.push({ spriteKey: this.stowed.iconSpriteKey, hasAmmo: hasAmmo, ammo: ammo });
        }
        this.coolDownTimer = new Timer(this.equipped.cooldown, () => {
            this.equipped.finishAttack();

        });


        this.emitter.fireEvent(InGame_GUI_Events.UPDATE_EQUIP_SLOT, { slotData: slotData });
        this.equipped.setActive(this.owner.position.clone());
        this.emitter.fireEvent(InGame_GUI_Events.UPDATE_EQUIP_SLOT_OUTLINE, { spriteKey: this.equipped.iconSpriteKey });
    }

    switchEquipped(): void {
        let temp = this.equipped;
        this.equipped = this.stowed;
        temp.sprite.visible = false;
        this.stowed = temp;

    }

    activate(options: Record<string, any>): void { }

    handleEvent(event: GameEvent): void { 

    }

    resolvePlayerInput(deltaT: number): void {
        let rotateTo = Input.getGlobalMousePosition();

        this.direction.x = (Input.isPressed("left") ? -1 : 0) + (Input.isPressed("right") ? 1 : 0);
        this.direction.y = (Input.isPressed("forward") ? -1 : 0) + (Input.isPressed("backward") ? 1 : 0);

        if (this.direction.x === 0) this.velocity.x += -this.velocity.x / 4
        else this.velocity.x += this.direction.x * this.speed

        if (this.direction.y === 0) this.velocity.y += -this.velocity.y / 4
        else this.velocity.y += this.direction.y * this.speed


        if (!this.direction.isZero()) {
            this.velocity.normalize()
            this.velocity.mult(new Vec2(this.speed, this.speed));
            this.owner.animation.playIfNotAlready("WALK", true);
        }
        else {
            this.owner.animation.playIfNotAlready("IDLE", true);
        }

        if (this.hitTimer.isActive()) {

            if (Date.now() - this.hitFlashCooldown > 50) {
                this.owner.alpha = this.owner.alpha === 1 ? 0 : 1;
                this.hitFlashCooldown = Date.now();
            }
        }


        if (this.knockBack) {
            this.owner.move(this.knockBackVel.scaled(0.05 * deltaT, 0.05 * deltaT));
        }
        else {
            this.owner.move(this.velocity.scaled(deltaT));
        }
        if (Date.now() - this.damageCooldown > 200) {
            this.knockBack = false;
        }

        if (rotateTo.x > this.owner.position.x) {
            this.owner.invertX = true;
        }
        else {
            this.owner.invertX = false;
        }

        this.playerLookDirection = this.equipped.sprite.position.dirTo(rotateTo);
        this.equipped.updatePos(this.owner.position, this.playerLookDirection);
        this.stowed.updatePos(this.owner.position, this.playerLookDirection);
        this.equipped.setRot(-Vec2.UP.angleToCCW(this.playerLookDirection))



        if (Input.isMousePressed() && !this.pauseExecution) {
            if (!this.coolDownTimer.isActive()) {
                if (this.equipped.charges) {
                    this.equipped.doAttack(this.playerLookDirection, deltaT);
                    this.emitter.fireEvent(GameEventType.PLAY_SFX, { key: this.equipped.sfxKey, loop: false, holdReference: true });
                    this.emitter.fireEvent(InGame_Events.DO_SCREENSHAKE, { dir: this.playerLookDirection })
                    if (this.equipped.type === WeaponTypes.AMMO) {
                        this.emitter.fireEvent(InGame_GUI_Events.UPDATE_EQUIP_SLOT_AMMO, { spriteKey: this.equipped.iconSpriteKey, ammo: this.equipped.charges })
                    }

                    this.coolDownTimer.start();
                }
            }
        }

        if (Input.isKeyJustPressed("1")) {
            this.equipped.charges = 1000;
            this.stowed.charges = 1000;
            if (this.equipped.type === WeaponTypes.AMMO) {
                this.emitter.fireEvent(InGame_GUI_Events.UPDATE_EQUIP_SLOT_AMMO, { spriteKey: this.equipped.iconSpriteKey, ammo: this.equipped.charges })

            }
            if (this.stowed.type === WeaponTypes.AMMO) {
                this.emitter.fireEvent(InGame_GUI_Events.UPDATE_EQUIP_SLOT_AMMO, { spriteKey: this.stowed.iconSpriteKey, ammo: this.stowed.charges })

            }
        }
        if (Input.isKeyJustPressed("2")) {
           this.invulnerable = true;
        }

        if (Input.isKeyJustPressed("3")) {
            this.equipmentManager.spawnEquipment('TrashLid', this.owner.position.clone());

         }

         if (Input.isKeyJustPressed("4")) {
            this.equipmentManager.spawnEquipment('PillBottle', this.owner.position.clone());
         }


        if (Input.isKeyJustPressed("q") && this.stowed.type != undefined) {
            this.switchEquipped()
            this.equipped.setActive(this.owner.position.clone());
            this.emitter.fireEvent(InGame_GUI_Events.UPDATE_EQUIP_SLOT_OUTLINE, { spriteKey: this.equipped.iconSpriteKey });
            this.coolDownTimer = new Timer(this.equipped.cooldown, () => {
                this.equipped.finishAttack();

            });

        }
        if (Input.isKeyJustPressed("e") && (this.nearEquip > 0)) {
            this.emitter.fireEvent(InGame_Events.NOT_OVERLAP_EQUIP);
            let pickup = this.equipmentManager.pickupEquipped(this.nearEquip);
            if (this.stowed.type !== undefined) {
                this.equipped.inInventory = false;
                this.equipmentManager.spawnEquipment(this.equipped.name, this.owner.position.clone());
                this.equipped = pickup;
            }
            else {
                this.stowed = pickup;
                this.switchEquipped();
            }

            this.initEquip();
        }

        if (Input.isKeyJustPressed("e") && (this.nearUpperDeposit > 0)) {
            let count = this.upperCount;
            this.canDepositUpper = false;
            this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: "deposit", loop: false, holdReference: true});
            this.emitter.fireEvent(InGame_GUI_Events.CLEAR_UPPER_LABEL, { position: this.owner.position.clone() });
            this.emitter.fireEvent(InGame_Events.UPDATE_MOOD, { type: 1, count: count });
            this.emitter.fireEvent(InGame_Events.UPDATE_GROWTH, {count: count });
            this.upperCount = 0;
            this.nearUpperDeposit = -1

            this.emitter.fireEvent(InGame_GUI_Events.HIDE_INTERACT_LABEL);
        }

        if (Input.isKeyJustPressed("e") && (this.nearDownerDeposit > 0)) {
            let count = this.downerCount;
            this.canDepositDowner = false;
            this.emitter.fireEvent(GameEventType.PLAY_SOUND, {key: "deposit", loop: false, holdReference: true});
            this.emitter.fireEvent(InGame_GUI_Events.CLEAR_DOWNER_LABEL, { position: this.owner.position.clone() });
            this.emitter.fireEvent(InGame_Events.UPDATE_MOOD, { type: -1, count: count });
            this.emitter.fireEvent(InGame_Events.UPDATE_GROWTH, {count: count });
            this.downerCount = 0;
            this.nearDownerDeposit = -1
            this.emitter.fireEvent(InGame_GUI_Events.HIDE_INTERACT_LABEL);
        }


    }

    update(deltaT: number): void {
        if (!this.gameOver) {
            if (!this.pauseExecution) this.resolvePlayerInput(deltaT);

            while (this.receiver.hasNextEvent()) {
                let event = this.receiver.getNextEvent();
                if (event.type === InGame_Events.GAME_OVER) {
                    this.gameOver = true;
                    this.owner.disablePhysics();
                    this.equipped.disable();
                }

                if (event.type === InGame_Events.TOGGLE_PAUSE) {
                    if (this.pauseExecution) this.pauseExecution = false;
                    else this.pauseExecution = true;
                }

                if (event.type === InGame_Events.OVERLAP_EQUIP && (this.nearEquip < 0)) {
                    console.log('overlap')
                    let other = event.data.get('other');
                    this.nearEquip = other;
                    let equip = this.owner.getScene().getSceneGraph().getNode(other);
                    this.emitter.fireEvent(InGame_GUI_Events.SHOW_INTERACT_LABEL, { position: equip.position});
                }

                if (event.type === InGame_Events.NOT_OVERLAP_EQUIP) {
                    this.nearEquip = -1;
                    this.emitter.fireEvent(InGame_GUI_Events.HIDE_INTERACT_LABEL);
                }


                if (event.type === InGame_Events.PLAYER_ENEMY_COLLISION) {
                    if(!this.invulnerable) {
                        if (this.damaged) {
                            if (Date.now() - this.damageCooldown > 2000) {
                                this.damaged = false;
                            }
                        }
                        else {
                            let enemy = this.owner.getScene().getSceneGraph().getNode(event.data.get("other"));
                            this.hitFlashCooldown = Date.now();
                            this.emitter.fireEvent(GameEventType.PLAY_SOUND, { key: "player_hit", holdReference: true });
                           
                            this.knockBack = true;
                            // if(enemy._ai) {
                            //     if((<EnemyController>enemy._ai).dropType === 'ram') {
                            //         this.knockBackVel = (<EnemyController>enemy._ai).velocity.scale(0.4);
    
                            //     }
                            //     else {
                            //         this.knockBackVel = (<EnemyController>enemy._ai).velocity.scale(0.1);
    
                            //     }
                            // }
    
    
    
                            this.hitTimer.start();
                            this.emitter.fireEvent(InGame_Events.DO_SCREENSHAKE, { dir: this.playerLookDirection })
                            this.damage(this.damageTaken); 
                            this.damaged = true;
                            this.damageCooldown = Date.now();
                            this.emitter.fireEvent(InGame_GUI_Events.UPDATE_HEALTHBAR, { damageTaken: this.damageTaken });
    
                        }
                    }
                    

                }

                if (event.type === InGame_GUI_Events.INCREMENT_UPPER_COUNT) {
                    this.upperCount++;
                }

                if (event.type === InGame_GUI_Events.INCREMENT_DOWNER_COUNT) {
                    this.downerCount++;
                }

                if(event.type === InGame_Events.ON_UPPER_DEPOSIT && (this.nearUpperDeposit < 0)){
                    if(this.upperCount > 0) {
                        let other = event.data.get('other');
                        this.nearUpperDeposit = other;
                        let box = this.owner.getScene().getSceneGraph().getNode(other);
                        this.emitter.fireEvent(InGame_GUI_Events.SHOW_INTERACT_LABEL, { position: box.position});
                    }
                }

                if(event.type === InGame_Events.ON_DOWNER_DEPOSIT && (this.nearDownerDeposit < 0)) {
                    if(this.downerCount > 0) {
                        let other = event.data.get('other');
                        this.nearDownerDeposit = other;
                        let box = this.owner.getScene().getSceneGraph().getNode(other);
                        this.emitter.fireEvent(InGame_GUI_Events.SHOW_INTERACT_LABEL, { position: box.position});
                    }
                }

                if (event.type === InGame_Events.OFF_DOWNER_DEPOSIT || event.type === InGame_Events.OFF_UPPER_DEPOSIT) {
                    this.nearUpperDeposit = -1
                    this.nearDownerDeposit = -1
                    this.emitter.fireEvent(InGame_GUI_Events.HIDE_INTERACT_LABEL);
                }

                if (event.type === InGame_Events.ADD_PLAYER_HEALTH){
                    this.health += 1; 
                }

                if(event.type === InGame_Events.REFRESH_AMMO){
                    if(this.equipped.name == "PillBottle"){
                        this.equipped.charges += 50;
                    }
                    if(this.equipped.name == "TrashLid"){
                        this.equipped.charges += 10;
                    }
                    if(this.equipped.name == "Shovel"){
                        this.equipped.charges = 1;
                    }

                    if(this.stowed.name == "PillBottle"){
                        this.stowed.charges += 50;
                    }
                    if(this.stowed.name == "TrashLid"){
                        this.stowed.charges += 10;
                    }
                    if(this.stowed.name == "Shovel"){
                        this.stowed.charges = 1;
                    }

  
                
                    if (this.equipped.type === WeaponTypes.AMMO) {
                        this.emitter.fireEvent(InGame_GUI_Events.UPDATE_EQUIP_SLOT_AMMO, { spriteKey: this.equipped.iconSpriteKey, ammo: this.equipped.charges })
        
                    }

                    if (this.stowed.type === WeaponTypes.AMMO) {
                        this.emitter.fireEvent(InGame_GUI_Events.UPDATE_EQUIP_SLOT_AMMO, { spriteKey: this.stowed.iconSpriteKey, ammo: this.stowed.charges })
        
                    }

                }

            }
        }
    }

    damage(damage: number): void {
        this.health -= damage;
        if (this.health <= 0) {
            this.emitter.fireEvent(InGame_Events.PLAYER_DIED);
        }
    }

    
    destroy(): void {
        console.log('destroying player ai')
        this.receiver.destroy();
    }

    subscribeToEvents(): void {
        this.receiver.subscribe([
            InGame_Events.PLAYER_ENEMY_COLLISION,
            InGame_Events.PLAYER_DIED,
            InGame_GUI_Events.INCREMENT_UPPER_COUNT,
            InGame_GUI_Events.INCREMENT_DOWNER_COUNT,
            InGame_Events.ON_UPPER_DEPOSIT,
            InGame_Events.ON_DOWNER_DEPOSIT,
            InGame_Events.OFF_UPPER_DEPOSIT,
            InGame_Events.OFF_DOWNER_DEPOSIT,
            InGame_Events.TOGGLE_PAUSE,
            InGame_Events.GAME_OVER,
            InGame_Events.OVERLAP_EQUIP,
            InGame_Events.NOT_OVERLAP_EQUIP,
            InGame_Events.REFRESH_AMMO,
            InGame_Events.ADD_PLAYER_HEALTH

        ]);
    }

}