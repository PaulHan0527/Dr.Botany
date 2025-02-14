import Receiver from "../../Wolfie2D/Events/Receiver";
import PlayerController from "../Controllers/PlayerController";
import EnemyController from "../Enemies/EnemyController";
import { InGame_Events, PlantMoods, InGame_GUI_Events } from "../Utils/Enums";
import Updateable from "../../Wolfie2D/DataTypes/Interfaces/Updateable";
import MathUtils from "../../Wolfie2D/Utils/MathUtils";
import Emitter from "../../Wolfie2D/Events/Emitter";
import Scene from "../../Wolfie2D/Scene/Scene";
import Input from "../../Wolfie2D/Input/Input";
import Timer from "../../Wolfie2D/Timing/Timer";
import PlantManager from "./PlantManager";

export default class GrowthManager implements Updateable {

    receiver: Receiver = new Receiver();
    materialsToWin: number;
    growthComplete: boolean = false;
    firstGrowthReached: boolean = false;
    timer: Timer = new Timer(3000, () => {

    }, false);


    scoreIncreasePerMaterial: number;
    growthIncreasePerMaterial: number; //determines how much the position changes for growth slider 

    score: number = 0;


    emitter: Emitter = new Emitter();
    scene: Scene;

    constructor(scene: Scene, materialsToWin: number = 50) {
        this.scene = scene;
        this.materialsToWin = materialsToWin;

        this.scoreIncreasePerMaterial = 100 / materialsToWin;
        this.growthIncreasePerMaterial = 60 / materialsToWin

        this.receiver.subscribe([
            InGame_Events.UPDATE_GROWTH,
            InGame_Events.PLANT_HIT
        ]);

    }

    destroy(): void {
        this.receiver.destroy();
    }

    increaseGrowthScore(count: number): void {
        let growthIncrease = count * this.growthIncreasePerMaterial;
        this.score += count * this.scoreIncreasePerMaterial;
        this.score = MathUtils.clamp(this.score, 0, 100)

        this.emitter.fireEvent(InGame_GUI_Events.UPDATE_GROWTH_BAR, { growthIncrease: growthIncrease, score: this.score });

        this.checkGrowthComplete();
    }

    decreaseGrowthScore(number: number): void {
        let growthDecrease;
        // this part is weird
        if (number) {
            this.score += -number;
            growthDecrease = -.6 * this.score
        }
        else {
            growthDecrease = -.6;
            this.score += -1;
        }
        this.score = MathUtils.clamp(this.score, 0, 100)

        this.emitter.fireEvent(InGame_GUI_Events.UPDATE_GROWTH_BAR, { growthIncrease: growthDecrease, score: this.score });
    }

    checkGrowthComplete(): void {
        if (this.score == 100) {
            this.growthComplete = true;
        }

        if (!this.firstGrowthReached && this.score == 50) {
            this.firstGrowthReached = true;
            this.emitter.fireEvent(InGame_Events.GROWTH_STARTED);
        }
    }


    update(deltaT: number): void {
        while (this.receiver.hasNextEvent()) {
            let event = this.receiver.getNextEvent();

            if (event.type === InGame_Events.UPDATE_GROWTH) {
                let count = event.data.get('count');
                this.increaseGrowthScore(count);
            }

            if (event.type === InGame_Events.PLANT_HIT) {
                if (this.timer.isStopped()) {
                    let owner = this.scene.getSceneGraph().getNode(event.data.get('node'))
                    if ((<EnemyController>owner.ai).attackType === "bomb") {
                        this.decreaseGrowthScore(20);
                    }
                    else {
                        this.decreaseGrowthScore(0);
                    }
                    this.timer.start();

                }



            }



        }

        if (this.growthComplete) {
            this.receiver.destroy();
            this.emitter.fireEvent(InGame_Events.GROWTH_COMPLETED);

            this.growthComplete = false;
        }

        if (Input.isKeyJustPressed("x")) {
            this.increaseGrowthScore(1);
        }

    }

}
