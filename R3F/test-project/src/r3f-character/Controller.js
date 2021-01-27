export const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    space: false,
    shift: false,
    t: false,
}
export const handleKeyDown = (e) => {
    switch (e.keyCode) {
        case 87: // w
            keys.forward = true;
            break;
        case 65: // a
            keys.left = true;
            break;
        case 83: // s
            keys.backward = true;
            break;
        case 68: // d
            keys.right = true;
            break;
        case 32: // space
            keys.space = true;
            break;
        case 16: // shift
            keys.shift = true;
            break;
        case 84: // t
            keys.t = true;
            break;
        default:
            break;
    }
}
export const handleKeyUp = (e) => {
    switch (e.keyCode) {
        case 87: // w
            keys.forward = false;
            break;
        case 65: // a
            keys.left = false;
            break;
        case 83: // s
            keys.backward = false;
            break;
        case 68: // d
            keys.right = false;
            break;
        case 32: // space
            keys.space = false;
            break;
        case 16: // shift
            keys.shift = false;
            break;
        case 84: // t
            keys.t = false;
            break;
        default:
            break;
    }
}
export const animationToDo = (keys) => {
    switch (keys) {
        case keys.w === true:
            return "walk_strip";
        case keys.s === true:
            return "walk_strip";
        case keys.a === true:
            return "walk_strip";
        case keys.d === true:
            return "walk_strip";
        case keys.t === true:
            return "t_pose";
        case keys.w === true && keys.shift === true:
            return "run_strip";
        case keys.space === true:
            return "jump_strip";
        default:
            return "idle_strip";
    }
}