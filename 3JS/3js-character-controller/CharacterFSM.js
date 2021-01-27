import FiniteStateMachine from "./FiniteStateMachine.js"
import IdleState from "./IdleState.js"
import RunState from "./RunState.js"
import WalkState from "./WalkState.js"
import DanceState from "./DanceState.js"

export default class CharacterFSM extends FiniteStateMachine {
    constructor(proxy) {
        super();
        this._proxy = proxy;
        this._Init();
    }

    _Init() {
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('run', RunState);
        this._AddState('dance', DanceState);
    }
};