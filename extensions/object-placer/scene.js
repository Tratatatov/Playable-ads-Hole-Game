'use strict';
const cc = require('cc');

let previewNode = null;

/**
 * Recursively find a node by its UUID within a tree.
 * @param {cc.Node} root - The root node to start searching from.
 * @param {string} uuid - The UUID of the node to find.
 * @returns {cc.Node|null} - The found node, or null if not found.
 */
function findNodeByUuid(root, uuid) {
    if (!root) return null;
    if (root.uuid === uuid) return root;
    for (let i = 0; i < root.children.length; ++i) {
        const found = findNodeByUuid(root.children[i], uuid);
        if (found) return found;
    }
    return null;
}

exports.load = function() {};
exports.unload = function() {
    exports.methods.removePreview();
};

exports.methods = {
    /**
     * Casts a ray into the scene physics world.
     * @param {number} originX 
     * @param {number} originY 
     * @param {number} originZ 
     * @param {number} dirX 
     * @param {number} dirY 
     * @param {number} dirZ 
     * @returns {Object} Raycast result.
     */
    raycast(originX, originY, originZ, dirX, dirY, dirZ) {
        const ray = new cc.geometry.Ray(originX, originY, originZ, dirX, dirY, dirZ);
        
        if (cc.PhysicsSystem.instance && cc.PhysicsSystem.instance.raycastClosest(ray, 0xffffffff, 10000)) {
            const res = cc.PhysicsSystem.instance.raycastClosestResult;
            return {
                hit: true,
                point: { x: res.hitPoint.x, y: res.hitPoint.y, z: res.hitPoint.z },
                normal: { x: res.hitNormal.x, y: res.hitNormal.y, z: res.hitNormal.z }
            };
        }
        
        // Fallback: intersect Y=0 plane analytically if ray points downwards
        if (dirY < 0) {
            const t = -originY / dirY;
            if (t > 0) {
                return {
                    hit: true,
                    point: {
                        x: originX + dirX * t,
                        y: 0,
                        z: originZ + dirZ * t
                    },
                    normal: { x: 0, y: 1, z: 0 }
                };
            }
        }
        
        return { hit: false };
    },

    /**
     * Instantiates a prefab into the scene at given transform.
     * @param {string} prefabUuid 
     * @param {number} posX 
     * @param {number} posY 
     * @param {number} posZ 
     * @param {number} rotX 
     * @param {number} rotY 
     * @param {number} rotZ 
     * @param {number} rotW 
     * @param {number} scaleX 
     * @param {number} scaleY 
     * @param {number} scaleZ 
     * @param {string} [parentUuid] 
     * @returns {Promise<string>} The UUID of the instantiated node.
     */
    async placePrefab(prefabUuid, posX, posY, posZ, rotX, rotY, rotZ, rotW, scaleX, scaleY, scaleZ, parentUuid) {
        return new Promise((resolve, reject) => {
            cc.assetManager.loadAny({ uuid: prefabUuid }, (err, prefab) => {
                if (err) {
                    return reject(err);
                }
                const node = cc.instantiate(prefab);
                node.worldPosition = new cc.Vec3(posX, posY, posZ);
                node.worldRotation = new cc.Quat(rotX, rotY, rotZ, rotW);
                node.setScale(new cc.Vec3(scaleX, scaleY, scaleZ));
                
                let parent = cc.director.getScene();
                if (parentUuid) {
                    const found = findNodeByUuid(parent, parentUuid);
                    if (found) parent = found;
                }
                parent.addChild(node);
                
                resolve(node.uuid);
            });
        });
    },

    /**
     * Creates a semi-transparent preview of a prefab.
     * @param {string} prefabUuid 
     * @param {number} colorR 
     * @param {number} colorG 
     * @param {number} colorB 
     * @param {number} opacity 
     * @returns {Promise<boolean>}
     */
    async createPreview(prefabUuid, colorR, colorG, colorB, opacity) {
        exports.methods.removePreview();
        
        return new Promise((resolve) => {
            cc.assetManager.loadAny({ uuid: prefabUuid }, (err, prefab) => {
                if (err) {
                    return resolve(false);
                }
                previewNode = cc.instantiate(prefab);
                previewNode.name = '__object_placer_preview__';
                
                const meshRenderers = previewNode.getComponentsInChildren(cc.MeshRenderer);
                const color = new cc.Color(colorR * 255, colorG * 255, colorB * 255, opacity * 255);
                
                meshRenderers.forEach(mr => {
                    const newMaterials = [];
                    const sharedMaterials = mr.sharedMaterials;
                    for (let i = 0; i < sharedMaterials.length; i++) {
                        const mat = sharedMaterials[i];
                        if (mat) {
                            const newMat = new cc.MaterialInstance({ parent: mat });
                            newMat.setProperty('mainColor', color);
                            newMaterials.push(newMat);
                        } else {
                            newMaterials.push(null);
                        }
                    }
                    mr.sharedMaterials = newMaterials;
                });
                
                cc.director.getScene().addChild(previewNode);
                resolve(true);
            });
        });
    },

    /**
     * Updates the transform of the active preview node.
     * @param {number} posX 
     * @param {number} posY 
     * @param {number} posZ 
     * @param {number} rotX 
     * @param {number} rotY 
     * @param {number} rotZ 
     * @param {number} rotW 
     * @param {number} scaleX 
     * @param {number} scaleY 
     * @param {number} scaleZ 
     * @returns {boolean}
     */
    updatePreview(posX, posY, posZ, rotX, rotY, rotZ, rotW, scaleX, scaleY, scaleZ) {
        if (!previewNode) return false;
        
        previewNode.worldPosition = new cc.Vec3(posX, posY, posZ);
        previewNode.worldRotation = new cc.Quat(rotX, rotY, rotZ, rotW);
        previewNode.setScale(new cc.Vec3(scaleX, scaleY, scaleZ));
        return true;
    },

    /**
     * Removes and cleans up the active preview node.
     * @returns {boolean}
     */
    removePreview() {
        if (previewNode) {
            previewNode.removeFromParent();
            previewNode.destroy();
            previewNode = null;
        }
        return true;
    },

    /**
     * Gets camera data from the editor view, or fallback to first scene camera.
     * @returns {Object} Camera info.
     */
    getEditorCameraInfo() {
        try {
            const cce = globalThis.cce;
            if (cce && cce.Camera && cce.Camera.camera) {
                const camera = cce.Camera.camera;
                const node = camera.node;
                
                const f32View = new Float32Array(16);
                const f32Proj = new Float32Array(16);
                
                cc.Mat4.toArray(f32View, camera.matView);
                cc.Mat4.toArray(f32Proj, camera.matProj);
                
                return {
                    found: true,
                    position: { x: node.worldPosition.x, y: node.worldPosition.y, z: node.worldPosition.z },
                    forward: { x: node.forward.x, y: node.forward.y, z: node.forward.z },
                    up: { x: node.up.x, y: node.up.y, z: node.up.z },
                    right: { x: node.right.x, y: node.right.y, z: node.right.z },
                    fov: camera.fov,
                    near: camera.nearClip,
                    far: camera.farClip,
                    isOrtho: camera.projection === cc.Camera.ProjectionType.ORTHO,
                    orthoHeight: camera.orthoHeight,
                    matView: Array.from(f32View),
                    matProj: Array.from(f32Proj)
                };
            }
        } catch (e) {
            // Silently fallback if anything throws
        }
        
        // Fallback to scene camera
        const scene = cc.director.getScene();
        if (scene) {
            const cameras = scene.getComponentsInChildren(cc.Camera);
            if (cameras && cameras.length > 0) {
                const camera = cameras[0];
                const node = camera.node;
                
                const f32View = new Float32Array(16);
                const f32Proj = new Float32Array(16);
                
                cc.Mat4.toArray(f32View, camera.matView);
                cc.Mat4.toArray(f32Proj, camera.matProj);
                
                return {
                    found: true,
                    position: { x: node.worldPosition.x, y: node.worldPosition.y, z: node.worldPosition.z },
                    forward: { x: node.forward.x, y: node.forward.y, z: node.forward.z },
                    up: { x: node.up.x, y: node.up.y, z: node.up.z },
                    right: { x: node.right.x, y: node.right.y, z: node.right.z },
                    fov: camera.fov,
                    near: camera.near,
                    far: camera.far,
                    isOrtho: camera.projection === cc.Camera.ProjectionType.ORTHO,
                    orthoHeight: camera.orthoHeight,
                    matView: Array.from(f32View),
                    matProj: Array.from(f32Proj)
                };
            }
        }
        
        return { found: false };
    },

    /**
     * Raycast from normalized device coordinates using the active editor or scene camera.
     * @param {number} ndcX 
     * @param {number} ndcY 
     * @returns {Object} Raycast result.
     */
    raycastFromNDC(ndcX, ndcY) {
        const camInfo = exports.methods.getEditorCameraInfo();
        if (!camInfo || !camInfo.found) {
            return { hit: false };
        }
        
        const viewMat = new cc.Mat4();
        cc.Mat4.fromArray(viewMat, camInfo.matView);
        
        const projMat = new cc.Mat4();
        cc.Mat4.fromArray(projMat, camInfo.matProj);
        
        const vpMat = new cc.Mat4();
        cc.Mat4.multiply(vpMat, projMat, viewMat);
        
        const invVP = new cc.Mat4();
        cc.Mat4.invert(invVP, vpMat);
        
        const near = new cc.Vec3(ndcX, ndcY, -1);
        const far = new cc.Vec3(ndcX, ndcY, 1);
        
        const worldNear = new cc.Vec3();
        cc.Vec3.transformMat4(worldNear, near, invVP);
        
        const worldFar = new cc.Vec3();
        cc.Vec3.transformMat4(worldFar, far, invVP);
        
        const dir = new cc.Vec3();
        cc.Vec3.subtract(dir, worldFar, worldNear);
        cc.Vec3.normalize(dir, dir);
        
        return exports.methods.raycast(
            worldNear.x, worldNear.y, worldNear.z,
            dir.x, dir.y, dir.z
        );
    }
};
