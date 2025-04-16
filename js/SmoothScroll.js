(function () {
    const options = {
        frameRate: 150,
        animationTime: 400,
        stepSize: 120,
        pulseAlgorithm: true,
        pulseScale: 8,
        pulseNormalize: 1,
        accelerationDelta: 20,
        accelerationMax: 1,
        keyboardSupport: true,
        arrowScroll: 50,
        touchpadSupport: true,
        fixedBackground: true,
        excluded: ''
    };

    let direction = { x: 0, y: 0 };
    let que = [];
    let pending = false;
    let lastScroll = Date.now();
    let deltaBuffer = [120, 120, 120];
    let activeElement = document.body;

    const key = {
        left: 37, up: 38, right: 39, down: 40, space: 32,
        pageup: 33, pagedown: 34, end: 35, home: 36
    };

    function scrollArray(elem, left, top) {
        directionCheck(left, top);

        const now = Date.now();
        if (options.accelerationMax !== 1) {
            const elapsed = now - lastScroll;
            if (elapsed < options.accelerationDelta) {
                const factor = Math.min((1 + (30 / elapsed)) / 2, options.accelerationMax);
                left *= factor;
                top *= factor;
            }
            lastScroll = now;
        }

        que.push({ x: left, y: top, start: now, lastX: 0, lastY: 0 });

        if (pending) return;
        pending = true;

        function step() {
            const now = Date.now();
            let scrollX = 0;
            let scrollY = 0;

            for (let i = 0; i < que.length; i++) {
                const item = que[i];
                const elapsed = now - item.start;
                const finished = elapsed >= options.animationTime;
                let position = finished ? 1 : elapsed / options.animationTime;

                if (options.pulseAlgorithm) {
                    position = pulse(position);
                }

                const x = (item.x * position - item.lastX) | 0;
                const y = (item.y * position - item.lastY) | 0;

                scrollX += x;
                scrollY += y;

                item.lastX += x;
                item.lastY += y;

                if (finished) que.splice(i--, 1);
            }

            window.scrollBy(scrollX, scrollY);

            if (que.length) {
                requestAnimationFrame(step);
            } else {
                pending = false;
            }
        }

        requestAnimationFrame(step);
    }

    function wheel(event) {
        const deltaX = event.wheelDeltaX || 0;
        const deltaY = event.wheelDeltaY || event.wheelDelta || 0;

        if (!options.touchpadSupport && isTouchpad(deltaY)) return true;

        const scaledX = Math.abs(deltaX) > 1.2 ? deltaX * options.stepSize / 120 : deltaX;
        const scaledY = Math.abs(deltaY) > 1.2 ? deltaY * options.stepSize / 120 : deltaY;

        scrollArray(document.body, -scaledX, -scaledY);
        event.preventDefault();
    }

    function keydown(event) {
        const target = event.target;
        const modifier = event.ctrlKey || event.altKey || event.metaKey ||
            (event.shiftKey && event.keyCode !== key.space);

        if (/input|textarea|select|embed/i.test(target.nodeName) ||
            target.isContentEditable || event.defaultPrevented || modifier) return true;

        let x = 0, y = 0;
        const clientHeight = window.innerHeight;

        switch (event.keyCode) {
            case key.up: y = -options.arrowScroll; break;
            case key.down: y = options.arrowScroll; break;
            case key.space: y = -clientHeight * (event.shiftKey ? 1 : -1) * 0.9; break;
            case key.pageup: y = -clientHeight * 0.9; break;
            case key.pagedown: y = clientHeight * 0.9; break;
            case key.home: y = -window.scrollY; break;
            case key.end: y = document.body.scrollHeight - window.scrollY - clientHeight + 10; break;
            case key.left: x = -options.arrowScroll; break;
            case key.right: x = options.arrowScroll; break;
            default: return true;
        }

        scrollArray(document.body, x, y);
        event.preventDefault();
    }

    function mousedown(event) {
        activeElement = event.target;
    }

    function directionCheck(x, y) {
        x = x > 0 ? 1 : -1;
        y = y > 0 ? 1 : -1;
        if (direction.x !== x || direction.y !== y) {
            direction.x = x;
            direction.y = y;
            que = [];
            lastScroll = 0;
        }
    }

    function isTouchpad(deltaY) {
        if (!deltaY) return false;
        deltaY = Math.abs(deltaY);
        deltaBuffer.push(deltaY);
        deltaBuffer.shift();

        const allEqual = deltaBuffer.every(val => val === deltaBuffer[0]);
        const allDivisible = deltaBuffer.every(val => isDivisible(val, 120));

        return !(allEqual || allDivisible);
    }

    function isDivisible(n, divisor) {
        return Math.floor(n / divisor) === n / divisor;
    }

    function pulse(x) {
        if (x >= 1) return 1;
        if (x <= 0) return 0;
        if (options.pulseNormalize === 1) {
            options.pulseNormalize /= pulse_(1);
        }
        return pulse_(x);
    }

    function pulse_(x) {
        x *= options.pulseScale;
        return x < 1
            ? x - (1 - Math.exp(-x))
            : (1 - Math.exp(-1)) + (1 - Math.exp(-(x - 1))) * Math.exp(-1);
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('wheel', wheel, { passive: false });
        if (options.keyboardSupport) document.addEventListener('keydown', keydown);
        document.addEventListener('mousedown', mousedown);

        if (!options.fixedBackground) {
            document.body.style.backgroundAttachment = 'scroll';
            document.documentElement.style.backgroundAttachment = 'scroll';
        }
    });

})();
