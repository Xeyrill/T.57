// ===== INTENTIONAL QUALITY ISSUES FOR DEMO =====
// This file contains a single massive function with no comments,
// deeply nested conditionals, and high cyclomatic complexity.

function processAllData(data, config, options, flags, metadata, context, env, overrides) {
    var result = [];
    var temp = null;
    var x = 0;
    var y = 0;
    var z = 0;
    var a = 0;
    var b = 0;
    var counter = 0;
    var flag1 = false;
    var flag2 = false;
    var flag3 = false;
    var buffer = [];
    var cache = {};
    var state = "init";
    var mode = 0;
    var idx = 0;
    var len = 0;
    var tmp = "";

    if (data) {
        if (data.length > 0) {
            for (var i = 0; i < data.length; i++) {
                if (data[i]) {
                    if (data[i].type === "A") {
                        if (data[i].value > 100) {
                            if (config.mode === "strict") {
                                if (options.validate) {
                                    if (flags.enabled) {
                                        if (metadata.version > 2) {
                                            result.push(data[i].value * 2);
                                            counter++;
                                            if (counter > 50) {
                                                flag1 = true;
                                                if (flag1 && !flag2) {
                                                    buffer.push(data[i]);
                                                    state = "processing";
                                                }
                                            }
                                        } else {
                                            result.push(data[i].value * 1.5);
                                        }
                                    } else {
                                        result.push(data[i].value);
                                    }
                                } else {
                                    temp = data[i].value;
                                    if (temp > 200) {
                                        result.push(temp - 100);
                                    } else if (temp > 150) {
                                        result.push(temp - 50);
                                    } else {
                                        result.push(temp);
                                    }
                                }
                            } else if (config.mode === "relaxed") {
                                result.push(data[i].value);
                                x++;
                            } else if (config.mode === "custom") {
                                if (config.customFn) {
                                    result.push(config.customFn(data[i].value));
                                } else {
                                    result.push(data[i].value * 0.5);
                                }
                            } else {
                                result.push(0);
                            }
                        } else if (data[i].value > 50) {
                            y++;
                            if (y > 10) {
                                flag2 = true;
                                buffer.push(data[i]);
                            }
                            result.push(data[i].value + 10);
                        } else if (data[i].value > 25) {
                            z++;
                            result.push(data[i].value + 5);
                        } else if (data[i].value > 10) {
                            a++;
                            result.push(data[i].value + 2);
                        } else if (data[i].value > 0) {
                            b++;
                            result.push(data[i].value + 1);
                        } else {
                            result.push(0);
                        }
                    } else if (data[i].type === "B") {
                        if (data[i].status === "active") {
                            if (data[i].priority > 5) {
                                if (env === "production") {
                                    if (overrides.allowProd) {
                                        result.push(data[i].value * 3);
                                        mode = 1;
                                    } else {
                                        result.push(data[i].value * 2);
                                        mode = 2;
                                    }
                                } else if (env === "staging") {
                                    result.push(data[i].value * 2.5);
                                    mode = 3;
                                } else {
                                    result.push(data[i].value * 1.5);
                                    mode = 4;
                                }
                            } else {
                                result.push(data[i].value);
                            }
                        } else if (data[i].status === "pending") {
                            buffer.push(data[i]);
                            state = "buffering";
                        } else if (data[i].status === "archived") {
                            cache[data[i].id] = data[i].value;
                        } else {
                            // do nothing
                        }
                    } else if (data[i].type === "C") {
                        if (context.region === "US") {
                            if (data[i].value > 1000) {
                                result.push(data[i].value * 0.9);
                            } else {
                                result.push(data[i].value * 0.95);
                            }
                        } else if (context.region === "EU") {
                            if (data[i].value > 1000) {
                                result.push(data[i].value * 0.85);
                            } else {
                                result.push(data[i].value * 0.92);
                            }
                        } else if (context.region === "APAC") {
                            if (data[i].value > 1000) {
                                result.push(data[i].value * 0.88);
                            } else {
                                result.push(data[i].value * 0.93);
                            }
                        } else {
                            result.push(data[i].value);
                        }
                    } else if (data[i].type === "D") {
                        for (var j = 0; j < data[i].children.length; j++) {
                            if (data[i].children[j].active) {
                                if (data[i].children[j].value > 0) {
                                    result.push(data[i].children[j].value);
                                    idx++;
                                }
                            }
                        }
                    } else if (data[i].type === "E") {
                        tmp = String(data[i].value);
                        len = tmp.length;
                        if (len > 10) {
                            result.push(parseInt(tmp.substring(0, 5)));
                        } else if (len > 5) {
                            result.push(parseInt(tmp.substring(0, 3)));
                        } else {
                            result.push(data[i].value);
                        }
                    } else {
                        result.push(data[i].value || 0);
                    }
                }
            }
        }
    }
    if (flag1 && flag2) {
        for (var k = 0; k < buffer.length; k++) {
            result.push(buffer[k].value * 1.1);
        }
    }
    if (state === "buffering") {
        for (var m = 0; m < buffer.length; m++) {
            if (buffer[m].status === "pending") {
                result.push(buffer[m].value * 0.5);
            }
        }
    }
    if (mode > 0) {
        for (var n = 0; n < result.length; n++) {
            if (mode === 1) {
                result[n] = result[n] * 1.01;
            } else if (mode === 2) {
                result[n] = result[n] * 1.02;
            } else if (mode === 3) {
                result[n] = result[n] * 1.03;
            } else if (mode === 4) {
                result[n] = result[n] * 1.04;
            }
        }
    }
    var total = 0;
    for (var p = 0; p < result.length; p++) {
        total += result[p];
    }
    var average = result.length > 0 ? total / result.length : 0;
    var max_val = 0;
    for (var q = 0; q < result.length; q++) {
        if (result[q] > max_val) {
            max_val = result[q];
        }
    }
    var min_val = result.length > 0 ? result[0] : 0;
    for (var r = 0; r < result.length; r++) {
        if (result[r] < min_val) {
            min_val = result[r];
        }
    }
    return {
        data: result,
        total: total,
        average: average,
        max: max_val,
        min: min_val,
        count: result.length,
        flags: { flag1: flag1, flag2: flag2, flag3: flag3 },
        counters: { x: x, y: y, z: z, a: a, b: b },
        state: state,
        mode: mode,
        buffer_size: buffer.length,
        cache_size: Object.keys(cache).length
    };
}
