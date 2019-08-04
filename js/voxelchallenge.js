
const CAMERA_NEAR = 1;
const CAMERA_FAR = 100;
const FRUSTUM_HALF_SIZE_MIN = 5;
const PICK_SCENE_LIGHT_POSITION = new THREE.Vector3(-3, 1, 30);
const PICK_SCENE_AMBIENT_INTENSITY = 0.4;
const PICK_SCENE_DIFFUSE_INTENSITY = 0.9;
const FINAL_SCENE_LIGHT_POSITION = new THREE.Vector3(-10, 20, 30);
const FINAL_SCENE_AMBIENT_INTENSITY = 0.4;
const FINAL_SCENE_DIFFUSE_INTENSITY = 0.6;

const BACKGROUND_COLOR = new THREE.Color(0xECEEF8);

const MATERIAL_DEFAULT_COLOR = 0xF7E1D7;
const MATERIAL_MARKED_COLOR = 0xA3D5FF;
const MATERIAL_NUMBER_COLOR = 0xF5CB5C;
const MATERIAL_SLIDER_COLOR = 0xF2545B;

const VOXEL_STATE_GRID = 0;
const VOXEL_STATE_MARKED = 1;
const VOXEL_STATE_CROSSED = 2;

const VOLUME_DIMENSION_MAX = 30;

const NUMBER_TEXTURE_DIGIT_COUNT_MIN = 2;

const DRAW_ACTION_MARK = 1;
const DRAW_ACTION_CROSS = 2;

class VoxelData {
	constructor(width, height, depth) {
		this.width = width;
		this.height = height;
		this.depth = depth;
		this.largestDimension = Math.max(width, Math.max(height, depth));
		this.halfwidth = width / 2;
		this.halfHeight = height / 2;
		this.halfDepth = depth / 2;
		this.centerX = (width - 1) / 2;
		this.centerY = (height - 1) / 2;
		this.centerZ = (depth - 1) / 2;
		this.boundingRadius = Math.sqrt(this.halfwidth * this.halfwidth + this.halfHeight * this.halfHeight
				+ this.halfDepth * this.halfDepth);
		this.widthHeight = width * height;
		this.widthDepth = width * depth;
		this.depthHeight = depth * height;
		this.widthHeightDepth = this.widthHeight * depth;
		this.voxels = new Array(this.widthHeightDepth);
		for (var i = 0; i < this.widthHeightDepth; i++) {
			this.voxels[i] = 0;
		}
		this.palette = [ 0 ];

		this.widthSegmentsMax = 0;
		this.heightSegmentsMax = 0;
		this.depthSegmentsMax = 0;
		this.boundingRadiusWithNumbers = 0;
	}

	getVoxelIndex(x, y, z) {
		return x + y * this.width + z * this.widthHeight;
	}

	getVoxelCell(index) {
		var z = Math.floor(index / this.widthHeight);
		var xy = index % this.widthHeight;
		var y = Math.floor(xy / this.width);
		var x = xy % this.width;
		return { x: x, y: y, z: z };
	}

	setVoxelState(index, state) {
		var voxel = this.voxels[index];
		this.voxels[index] = (voxel & 0xff) | (state << 8);
	}

	getVoxelState(index) {
		var voxel = this.voxels[index];
		return ((voxel & 0xff00) >> 8);
	}

	getVoxelColorIndex(index) {
		var voxel = this.voxels[index];
		return (voxel & 0xff);
	}

	isPuzzleSolved() {
		for (var i = 0; i < this.widthHeightDepth; i++) {
			var colorIndex = this.getVoxelColorIndex(i);
			var state = this.getVoxelState(i);
			if ((colorIndex && (state != VOXEL_STATE_MARKED))
					|| (!colorIndex && (state == VOXEL_STATE_MARKED))) {
				return false;
			}
		}
		return true;
	}

	showPuzzleSolution() {
		for (var i = 0; i < this.widthHeightDepth; i++) {
			var colorIndex = this.getVoxelColorIndex(i);
			if (colorIndex) {
				this.setVoxelState(i, VOXEL_STATE_MARKED);
			} else {
				this.setVoxelState(i, VOXEL_STATE_CROSSED);
			}
		}
	}

	computeSegments() {
		this.widthSegmentsMax = 0;
		for (var z = 0, i = 0; z < this.depth; z++) {
			for (var y = 0; y < this.height; y++) {
				var segments = 0;
				var count = 0;
				for (var x = 0; x < this.width; x++, i++) {
					var colorIndex = this.getVoxelColorIndex(i);
					if (colorIndex) {
						count++;
					}
					if ((!colorIndex || (x == this.width - 1)) && (count > 0)) {
						segments++;
						count = 0;
					}
				}
				if (segments > this.widthSegmentsMax) {
					this.widthSegmentsMax = segments;
				}
			}
		}

		this.heightSegmentsMax = 0;
		for (var z = 0; z < this.depth; z++) {
			for (var x = 0; x < this.width; x++) {
				var segments = 0;
				var count = 0;
				for (var y = 0, i = x + z * this.widthHeight; y < this.height; y++, i += this.width) {
					var colorIndex = this.getVoxelColorIndex(i);
					if (colorIndex) {
						count++;
					}
					if ((!colorIndex || (y == this.height - 1)) && (count > 0)) {
						segments++;
						count = 0;
					}
				}
				if (segments > this.heightSegmentsMax) {
					this.heightSegmentsMax = segments;
				}
			}
		}

		this.depthSegmentsMax = 0;
		for (var x = 0; x < this.width; x++) {
			for (var y = 0; y < this.height; y++) {
				var segments = 0;
				var count = 0;
				for (var z = 0, i = x + y * this.width; z < this.depth; z++, i += this.widthHeight) {
					var colorIndex = this.getVoxelColorIndex(i);
					if (colorIndex) {
						count++;
					}
					if ((!colorIndex || (z == this.depth - 1)) && (count > 0)) {
						segments++;
						count = 0;
					}
				}
				if (segments > this.depthSegmentsMax) {
					this.depthSegmentsMax = segments;
				}
			}
		}

		var halfwidthWithNumbers = this.halfwidth + this.widthSegmentsMax / 2;
		var halfHeightWithNumbers = this.halfHeight + this.heightSegmentsMax / 2;
		var halfDepthWithNumbers = this.halfDepth + this.depthSegmentsMax / 2;
		this.boundingRadiusWithNumbers = Math.sqrt(halfwidthWithNumbers * halfwidthWithNumbers
				+ halfHeightWithNumbers * halfHeightWithNumbers + halfDepthWithNumbers * halfDepthWithNumbers);
	}
}

class BaseScene extends THREE.Scene {
	constructor(assets, voxelData) {
		super();
		this.assets = assets;
		this.voxelData = voxelData;

		this.shadeless = false;
		this.background = BACKGROUND_COLOR;

		var aspect = window.innerWidth / window.innerHeight;
		this.frustumHalfSize = Math.max(voxelData.boundingRadiusWithNumbers, FRUSTUM_HALF_SIZE_MIN);
		this.camera = new THREE.OrthographicCamera(-aspect * this.frustumHalfSize, aspect * this.frustumHalfSize,
				this.frustumHalfSize, -this.frustumHalfSize, CAMERA_NEAR, CAMERA_FAR);
		this.camera.position.set(0, 0, CAMERA_FAR / 2);

		this.voxelGroup = new THREE.Group();
		this.add(this.voxelGroup);

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();
	}

	updateScene(dt) {
	}

	resizeViewport() {
		var aspect = window.innerWidth / window.innerHeight;
		this.camera.left = -aspect * this.frustumHalfSize;
		this.camera.right = aspect * this.frustumHalfSize;
		this.camera.top = this.frustumHalfSize;
		this.camera.bottom = -this.frustumHalfSize;
		this.camera.updateProjectionMatrix();
	}

	loadTexture(url) {
		var texture = new THREE.TextureLoader().load(url);
		texture.flipY = false;
		texture.anisotropy = 16;
		return texture;
	}

	getTexture(filename) {
		if (!this.assets.textures) {
			this.assets.textures = new Map();
		}
		if (!this.assets.textures.has(filename)) {
			var texture = this.loadTexture("res/" + filename);
			this.assets.textures.set(filename, texture);
		}
		return this.assets.textures.get(filename);
	}

	getVoxelGeometry() {
		return this.assets.voxelGeometry;
	}

	getFlatVoxelGeometry() {
		return this.assets.flatVoxelGeometry;
	}

	getSliderGeometry() {
		return this.assets.sliderGeometry;
	}

	getMaterial(name, color, map = null) {
		if (!this.assets.materials) {
			this.assets.materials = new Map();
		}
		var materialName = (this.shadeless ? "shadeless_" : "phong_") + name;
		var material = this.assets.materials[materialName];
		if (!material) {
			if (this.shadeless) {
				material = new THREE.MeshBasicMaterial({
					color: color,
					map: map
				});
			} else {
				material = new THREE.MeshPhongMaterial({
					color: color,
					map: map
				});
			}
			this.assets.materials[materialName] = material;
		}
		return material;
	}

	getGridMaterial() {
		return this.getMaterial("grid", MATERIAL_DEFAULT_COLOR, this.getTexture("grid.png"));
	}

	getMarkedMaterial() {
		return this.getMaterial("marked", MATERIAL_MARKED_COLOR, this.getTexture("grid.png"));
	}

	getCrossedMaterial() {
		return this.getMaterial("crossed", MATERIAL_DEFAULT_COLOR, this.getTexture("cross.png"));
	}

	getSliderMaterial() {
		return this.getMaterial("slider", MATERIAL_SLIDER_COLOR);
	}

	getNumberMaterial(number) {
		if ((number < 1) || (number > VOLUME_DIMENSION_MAX)) {
			throw new Error("Number material is out of range [1.." + VOLUME_DIMENSION_MAX + "]");
		}
		var numberStr = number + "";
		while (numberStr.length < NUMBER_TEXTURE_DIGIT_COUNT_MIN) {
			numberStr = "0" + numberStr;
		}
		return this.getMaterial("number" + numberStr, MATERIAL_NUMBER_COLOR,
				this.getTexture("numbers/num" + numberStr + ".png"));
	}

	getVoxelStateMaterial(state) {
		switch (state) {
			case VOXEL_STATE_GRID:
				return this.getGridMaterial();
			case VOXEL_STATE_MARKED:
				return this.getMarkedMaterial();
			case VOXEL_STATE_CROSSED:
				return this.getCrossedMaterial();
			default:
				return null;
		}
	}

	getVoxelPaletteMaterial(colorIndex) {
		return this.getMaterial("color" + colorIndex, this.voxelData.palette[colorIndex]);
	}

	setRaycaster(mouseX, mouseY) {
		this.mouse.x = (mouseX / window.innerWidth) * 2 - 1;
		this.mouse.y = -(mouseY / window.innerHeight) * 2 + 1;
		this.raycaster.setFromCamera(this.mouse, this.camera);
	}

	pickVoxel(mouseX, mouseY) {
		this.setRaycaster(mouseX, mouseY);
		var intersects = this.raycaster.intersectObjects(this.voxelGroup.children);
		if (intersects.length > 0) {
			var intersect = intersects[0];
			return { mesh: intersect.object, point: intersect.point, faceNormal: intersect.face.normal };
		}
		return null;
	}

	pickPlane(mouseX, mouseY, plane, target) {
		this.setRaycaster(mouseX, mouseY);
		return this.raycaster.ray.intersectPlane(plane, target);
	}
}

class FinalScene extends BaseScene {
	constructor(assets, voxelData) {
		super(assets, voxelData);

		var ambientLight = new THREE.AmbientLight(0xffffff, FINAL_SCENE_AMBIENT_INTENSITY);
		this.add(ambientLight);

		var directionalLight = new THREE.DirectionalLight(0xffffff, FINAL_SCENE_DIFFUSE_INTENSITY);
		directionalLight.position.copy(FINAL_SCENE_LIGHT_POSITION);
		this.add(directionalLight);

		this.voxelGroup.rotation.x = Math.PI / 12;
		for (var i = 0; i < voxelData.widthHeightDepth; i++) {
			var colorIndex = this.voxelData.getVoxelColorIndex(i);
			if (!colorIndex) {
				continue;
			}
			var mesh = new THREE.Mesh(this.getVoxelGeometry(), this.getVoxelPaletteMaterial(colorIndex));
			var cell = this.voxelData.getVoxelCell(i);
			mesh.position.set(cell.x - voxelData.centerX, cell.y - voxelData.centerY,
					cell.z - voxelData.centerZ);
			mesh.matrixAutoUpdate = false;
			mesh.updateMatrix();
			this.voxelGroup.add(mesh);
		}
	}

	updateScene(dt) {
		this.voxelGroup.rotation.y += -Math.PI / 4 * dt;
	}
}

class PickScene extends BaseScene {
	constructor(assets, voxelData) {
		super(assets, voxelData);

		var ambientLight = new THREE.AmbientLight(0xffffff, PICK_SCENE_AMBIENT_INTENSITY);
		this.add(ambientLight);

		var directionalLight = new THREE.DirectionalLight(0xffffff, PICK_SCENE_DIFFUSE_INTENSITY);
		directionalLight.position.copy(PICK_SCENE_LIGHT_POSITION);
		this.add(directionalLight);

		this.voxelViews = new Array(voxelData.widthHeightDepth);
		this.voxelGroup.rotation.x = Math.PI / 4;
		this.voxelGroup.rotation.y = -Math.PI / 4;
		for (var i = 0; i < voxelData.widthHeightDepth; i++) {
			var state = this.voxelData.getVoxelState(i);
			var mesh = new THREE.Mesh(this.getVoxelGeometry(), this.getVoxelStateMaterial(state));
			mesh.userData.voxelIndex = i;
			var cell = this.voxelData.getVoxelCell(i);
			mesh.position.set(cell.x - voxelData.centerX, cell.y - voxelData.centerY,
					cell.z - voxelData.centerZ);
			mesh.matrixAutoUpdate = false;
			mesh.updateMatrix();
			this.voxelGroup.add(mesh);
			this.voxelViews[i] = mesh;
		}

		this.sliderMeshXY = new THREE.Mesh(this.getSliderGeometry(), this.getSliderMaterial());
		this.sliderMeshXY.userData.sliderNormal = new THREE.Vector3(0, 0, 1);
		this.sliderMeshXY.userData.sliderPosition = new THREE.Vector3(-0.5 - voxelData.centerX,
				-0.5 - voxelData.centerY, voxelData.depth - 0.5 - voxelData.centerZ);
		this.sliderMeshXY.userData.sliderStepMax = voxelData.depth - 1;
		this.sliderMeshXY.userData.sliderStep = 0;
		this.sliderMeshXY.position.copy(this.sliderMeshXY.userData.sliderPosition);
		this.sliderMeshXY.matrixAutoUpdate = false;
		this.sliderMeshXY.updateMatrix();
		this.voxelGroup.add(this.sliderMeshXY);

		this.sliderMeshZY = new THREE.Mesh(this.getSliderGeometry(), this.getSliderMaterial());
		this.sliderMeshZY.userData.sliderNormal = new THREE.Vector3(1, 0, 0);
		this.sliderMeshZY.userData.sliderPosition = new THREE.Vector3(voxelData.width - 0.5 - voxelData.centerX,
				-0.5 - voxelData.centerY, -0.5 - voxelData.centerZ);
		this.sliderMeshZY.userData.sliderStepMax = voxelData.width - 1;
		this.sliderMeshZY.userData.sliderStep = 0;
		this.sliderMeshZY.position.copy(this.sliderMeshZY.userData.sliderPosition);
		this.sliderMeshZY.rotation.y = Math.PI / 2;
		this.sliderMeshZY.matrixAutoUpdate = false;
		this.sliderMeshZY.updateMatrix();
		this.voxelGroup.add(this.sliderMeshZY);

		this.sliderMeshXZ = new THREE.Mesh(this.getSliderGeometry(), this.getSliderMaterial());
		this.sliderMeshXZ.userData.sliderNormal = new THREE.Vector3(0, 1, 0);
		this.sliderMeshXZ.userData.sliderPosition = new THREE.Vector3(-0.5 - voxelData.centerX,
				voxelData.height - 0.5 - voxelData.centerY, -0.5 - voxelData.centerZ);
		this.sliderMeshXZ.userData.sliderStepMax = voxelData.height - 1;
		this.sliderMeshXZ.userData.sliderStep = 0;
		this.sliderMeshXZ.position.copy(this.sliderMeshXZ.userData.sliderPosition);
		this.sliderMeshXZ.rotation.x = -Math.PI / 2;
		this.sliderMeshXZ.matrixAutoUpdate = false;
		this.sliderMeshXZ.updateMatrix();
		this.voxelGroup.add(this.sliderMeshXZ);
	}

	updateVoxelMaterial(index) {
		var voxelView = this.voxelViews[index];
		var state = this.voxelData.getVoxelState(index);
		voxelView.material = this.getVoxelStateMaterial(state);
	}

	moveSlider(sliderMesh, delta) {
		var step = Math.min(Math.max(sliderMesh.userData.sliderStep + delta, 0), sliderMesh.userData.sliderStepMax);
		if (step != sliderMesh.userData.sliderStep) {
			sliderMesh.userData.sliderStep = step;
			sliderMesh.position.copy(sliderMesh.userData.sliderNormal).multiplyScalar(-step)
					.add(sliderMesh.userData.sliderPosition);
			sliderMesh.updateMatrix();
			this.updateVolume();
		}
	}

	resetSliders() {
		this.sliderMeshXY.userData.sliderStep = 0;
		this.sliderMeshXY.position.copy(this.sliderMeshXY.userData.sliderPosition);
		this.sliderMeshXY.updateMatrix();

		this.sliderMeshZY.userData.sliderStep = 0;
		this.sliderMeshZY.position.copy(this.sliderMeshZY.userData.sliderPosition);
		this.sliderMeshZY.updateMatrix();

		this.sliderMeshXZ.userData.sliderStep = 0;
		this.sliderMeshXZ.position.copy(this.sliderMeshXZ.userData.sliderPosition);
		this.sliderMeshXZ.updateMatrix();

		this.resetVolume();
	}

	resetVolume() {
		for (var i = 0; i < this.voxelData.widthHeightDepth; i++) {
			this.voxelViews[i].visible = true;
		}
	}

	cutVolume(sliderMesh) {
		var normal = sliderMesh.userData.sliderNormal;
		var step = sliderMesh.userData.sliderStep;

		var lx = Math.abs(normal.x);
		var ly = Math.abs(normal.y);
		var lz = Math.abs(normal.z);
		if ((lx > ly) && (lx > lz)) { // YZ plane
			for (var s = 0; s < step; s++) {
				var i = this.voxelData.width - 1 - s;
				for (var z = 0; z < this.voxelData.depth; z++) {
					for (var y = 0; y < this.voxelData.height; y++) {
						this.voxelViews[i].visible = false;
						i += this.voxelData.width;
					}
				}
			}
		} else if ((ly > lx) && (ly > lz)) { // XZ plane
			for (var s = 0; s < step; s++) {
				var i = (this.voxelData.height - 1 - s) * this.voxelData.width;
				for (var z = 0; z < this.voxelData.depth; z++) {
					for (var x = 0; x < this.voxelData.width; x++) {
						this.voxelViews[i].visible = false;
						i++;
					}
					i += this.voxelData.widthHeight - this.voxelData.width;
				}
			}
		} else { // XY plane
			for (var s = 0; s < step; s++) {
				var i = (this.voxelData.depth - 1 - s) * this.voxelData.widthHeight;
				for (var y = 0; y < this.voxelData.height; y++) {
					for (var x = 0; x < this.voxelData.width; x++) {
						this.voxelViews[i].visible = false;
						i++;
					}
				}
			}
		}
	}

	updateVolume() {
		this.resetVolume();
		this.cutVolume(this.sliderMeshXY);
		this.cutVolume(this.sliderMeshZY);
		this.cutVolume(this.sliderMeshXZ);
	}
}

class NonoScene extends BaseScene {
	constructor(assets, voxelData, cell, normal) {
		super(assets, voxelData);

		this.shadeless = true;

		var width;
		var height;
		var voxelIndexes;
		var lx = Math.abs(normal.x);
		var ly = Math.abs(normal.y);
		var lz = Math.abs(normal.z);
		if ((lx > ly) && (lx > lz)) { // YZ plane
			width = this.voxelData.depth;
			height = this.voxelData.height;
			voxelIndexes = new Array(this.voxelData.depthHeight);
			for (var i = 0; i < this.voxelData.depthHeight; i++) {
				var y = Math.floor(i / this.voxelData.depth);
				var z = this.voxelData.depth - 1 - (i % this.voxelData.depth);
				voxelIndexes[i] = this.voxelData.getVoxelIndex(cell.x, y, z);
			}
		} else if ((ly > lx) && (ly > lz)) { // XZ plane
			width = this.voxelData.width;
			height = this.voxelData.depth;
			voxelIndexes = new Array(this.voxelData.widthDepth);
			for (var i = 0; i < this.voxelData.widthDepth; i++) {
				var x = i % this.voxelData.width;
				var z = this.voxelData.depth - 1 - Math.floor(i / this.voxelData.width);
				voxelIndexes[i] = this.voxelData.getVoxelIndex(x, cell.y, z);
			}
		} else { // XY plane
			width = this.voxelData.width;
			height = this.voxelData.height;
			voxelIndexes = new Array(this.voxelData.widthHeight);
			for (var i = 0; i < this.voxelData.widthHeight; i++) {
				var x = i % this.voxelData.width;
				var y = Math.floor(i / this.voxelData.width);
				voxelIndexes[i] = this.voxelData.getVoxelIndex(x, y, cell.z);
			}
		}

		var centerX = (width - 1) / 2;
		var centerY = (height - 1) / 2;
		for (var i = 0; i < voxelIndexes.length; i++) {
			var index = voxelIndexes[i];
			var mesh = new THREE.Mesh(this.getFlatVoxelGeometry(), this.getVoxelStateMaterial(this.voxelData.getVoxelState(index)));
			mesh.userData.voxelIndex = index;
			var x = i % width;
			var y = Math.floor(i / width);
			mesh.position.set(x - centerX, y - centerY, 0);
			mesh.matrixAutoUpdate = false;
			mesh.updateMatrix();
			this.voxelGroup.add(mesh);
		}

		// Top numbers
		for (var x = 0; x < width; x++) {
			var segments = 0;
			var count = 0;
			for (var y = 0, i = x; y < height; y++, i += width) {
				var index = voxelIndexes[i];
				var colorIndex = this.voxelData.getVoxelColorIndex(index);
				if (colorIndex) {
					count++;
				}
				if ((!colorIndex || (y == height - 1)) && (count > 0)) {
					segments++;
					var mesh = new THREE.Mesh(this.getFlatVoxelGeometry(), this.getNumberMaterial(count));
					mesh.position.set(x - centerX, segments + height - 1 - centerY, 0);
					mesh.matrixAutoUpdate = false;
					mesh.updateMatrix();
					this.voxelGroup.add(mesh);
					count = 0;
				}
			}
		}

		// Left numbers
		for (var y = 0; y < height; y++) {
			var segments = 0;
			var count = 0;
			for (var x = width - 1, i = x + width * y; x >= 0; x--, i--) {
				var index = voxelIndexes[i];
				var colorIndex = this.voxelData.getVoxelColorIndex(index);
				if (colorIndex) {
					count++;
				}
				if ((!colorIndex || (x == 0)) && (count > 0)) {
					segments++;
					var mesh = new THREE.Mesh(this.getFlatVoxelGeometry(), this.getNumberMaterial(count));
					mesh.position.set(-segments - centerX, y - centerY, 0);
					mesh.matrixAutoUpdate = false;
					mesh.updateMatrix();
					this.voxelGroup.add(mesh);
					count = 0;
				}
			}
		}

		this.drawAction = DRAW_ACTION_MARK;
		this.actionSwitchMesh = new THREE.Mesh(this.getFlatVoxelGeometry(), this.getVoxelStateMaterial(VOXEL_STATE_CROSSED));
		this.actionSwitchMesh.userData.actionSwitch = true;
		this.actionSwitchMesh.position.set(-1 - centerX, 1 + height - 1 - centerY, 0);
		this.actionSwitchMesh.matrixAutoUpdate = false;
		this.actionSwitchMesh.updateMatrix();
		this.voxelGroup.add(this.actionSwitchMesh);
	}

	toggleState(mesh, state) {
		var index = mesh.userData.voxelIndex;
		var voxelState = this.voxelData.getVoxelState(index);
		if (voxelState == state) {
			this.voxelData.setVoxelState(index, VOXEL_STATE_GRID);
		} else {
			this.voxelData.setVoxelState(index, state);
		}
		this.updateVoxelMaterial(mesh);
	}

	toggleMarked(mesh) {
		this.toggleState(mesh, VOXEL_STATE_MARKED);
	}

	toggleCrossed(mesh) {
		this.toggleState(mesh, VOXEL_STATE_CROSSED);
	}

	toggleDrawAction() {
		if (this.drawAction == DRAW_ACTION_MARK) {
			this.drawAction = DRAW_ACTION_CROSS;
			this.actionSwitchMesh.material = this.getVoxelStateMaterial(VOXEL_STATE_MARKED);
		} else {
			this.drawAction = DRAW_ACTION_MARK;
			this.actionSwitchMesh.material = this.getVoxelStateMaterial(VOXEL_STATE_CROSSED);
		}
	}

	updateVoxelMaterial(mesh) {
		mesh.material = this.getVoxelStateMaterial(this.voxelData.getVoxelState(mesh.userData.voxelIndex));
	}
}

class VoxelChallenge {
	constructor() {
		this.clock = new THREE.Clock();
		this.assets = {};
		this.pickScene = null;
		this.nonoScene = null;
		this.finalScene = null;

		this.pickState = 0;
		this.pickedVoxel = null;
		this.sliderPlane = new THREE.Plane();
		this.sliderPosition = new THREE.Vector3();
		this.sliderNormal = new THREE.Vector3();
		this.sliderVector = new THREE.Vector3();
		this.sliderOffset = new THREE.Vector3();

		var loader = new THREE.GLTFLoader();
		loader.load("res/assets.gltf", (gltf) => {
			for (var child of gltf.scene.children) {
				switch (child.name) {
					case "Voxel": this.assets.voxelGeometry = child.geometry; break;
					case "FlatVoxel": this.assets.flatVoxelGeometry = child.geometry; break;
					case "Slider": this.assets.sliderGeometry = child.geometry; break;
				}
			}

			this.loadVoxFile("res/girl.vox");
		});
	}

	loadVoxFile(filename) {
		var parser = new vox.Parser();
		parser.parse(filename).then((data) => {
			var width = data.size.x;
			var height = data.size.z;
			var depth = data.size.y;

			var voxelData = new VoxelData(width, height, depth);
			var paletteMap = new Array(data.palette.length);
			for (var v of data.voxels) {
				if (!paletteMap[v.colorIndex]) {
					var color = data.palette[v.colorIndex];
					var colorHex = ((color.r & 0xff) << 16) | ((color.g & 0xff) << 8) | (color.b & 0xff);
					paletteMap[v.colorIndex] = voxelData.palette.length;
					voxelData.palette.push(colorHex);
				}
				var index = v.x + v.z * width + (depth - 1 - v.y) * voxelData.widthHeight;
				voxelData.voxels[index] = paletteMap[v.colorIndex];
			}
			voxelData.computeSegments();

			this.initScene(voxelData);
		});
	}

	initScene(voxelData) {
		if (voxelData.largestDimension > VOLUME_DIMENSION_MAX) {
			throw new Error("Voxel volume largest dimension (" + voxelData.largestDimension
					+ ") exceeds the maximum (" + VOLUME_DIMENSION_MAX + ")");
		}

		this.pickScene = new PickScene(this.assets, voxelData);
		this.nonoScene = null;
		this.finalScene = null;
	}

	resizeViewport() {
		if (this.pickScene) {
			this.pickScene.resizeViewport();
		}
		if (this.nonoScene) {
			this.nonoScene.resizeViewport();
		}
		if (this.finalScene) {
			this.finalScene.resizeViewport();
		}
	}

	render(renderer) {
		var dt = this.clock.getDelta();

		if (this.finalScene) {
			this.finalScene.updateScene(dt);
			renderer.render(this.finalScene, this.finalScene.camera);
		} else if (this.nonoScene) {
			this.nonoScene.updateScene(dt);
			renderer.render(this.nonoScene, this.nonoScene.camera);
		} else if (this.pickScene) {
			this.pickScene.updateScene(dt);
			renderer.render(this.pickScene, this.pickScene.camera);
		}
	}

	mouseDown(event) {
		if (this.finalScene) {
			return;
		}

		if (this.nonoScene) {
			this.pickedVoxel = this.nonoScene.pickVoxel(event.clientX, event.clientY);
			if (this.pickedVoxel && (this.pickedVoxel.mesh.userData.voxelIndex !== undefined)) {
				var index = this.pickedVoxel.mesh.userData.voxelIndex;
				if (this.nonoScene.drawAction == DRAW_ACTION_MARK) {
					this.nonoScene.toggleMarked(this.pickedVoxel.mesh);
				} else {
					this.nonoScene.toggleCrossed(this.pickedVoxel.mesh);
				}
				this.pickState = this.nonoScene.voxelData.getVoxelState(index);
				if (this.pickScene) {
					this.pickScene.updateVoxelMaterial(index);
				}
			}
		} else if (this.pickScene) {
			this.pickedVoxel = this.pickScene.pickVoxel(event.clientX, event.clientY);
			if (this.pickedVoxel) {
				if (this.pickedVoxel.mesh.userData.sliderNormal !== undefined) {
					this.sliderNormal.copy(this.pickedVoxel.mesh.userData.sliderNormal)
							.transformDirection(this.pickScene.voxelGroup.matrixWorld);
					this.pickedVoxel.mesh.getWorldPosition(this.sliderPosition);
					this.sliderPlane.normal.copy(this.pickScene.camera.position).sub(this.pickedVoxel.point)
							.normalize().cross(this.sliderNormal).normalize().cross(this.sliderNormal);
					this.sliderPlane.setFromNormalAndCoplanarPoint(this.sliderPlane.normal, this.pickedVoxel.point);
					this.sliderOffset.copy(this.sliderPosition).sub(this.pickedVoxel.point);
				}
			}
		} else {
			this.pickedVoxel = null;
		}
	}

	mouseMove(event) {
		if (this.finalScene || !this.pickedVoxel) {
			return;
		}

		if (this.nonoScene) {
			if (this.pickedVoxel.mesh.userData.voxelIndex !== undefined) {
				var currPickedVoxel = this.nonoScene.pickVoxel(event.clientX, event.clientY);
				if (currPickedVoxel && (currPickedVoxel.mesh.userData.voxelIndex !== undefined)) {
					var index = currPickedVoxel.mesh.userData.voxelIndex;
					var state = this.nonoScene.voxelData.getVoxelState(index);
					if (state != this.pickState) {
						this.nonoScene.voxelData.setVoxelState(index, this.pickState);
						this.nonoScene.updateVoxelMaterial(currPickedVoxel.mesh);
						if (this.pickScene) {
							this.pickScene.updateVoxelMaterial(index);
						}
					}
				}
			}
		} else if (this.pickScene) {
			if (this.pickedVoxel.mesh.userData.sliderNormal !== undefined) {
				if (this.pickScene.pickPlane(event.clientX, event.clientY, this.sliderPlane, this.sliderVector)) {
					this.pickedVoxel.mesh.getWorldPosition(this.sliderPosition);
					var delta = Math.floor(-this.sliderVector.add(this.sliderOffset)
							.sub(this.sliderPosition).dot(this.sliderNormal) + 0.5);
					if (delta) {
						this.pickScene.moveSlider(this.pickedVoxel.mesh, delta);
					}
				}
			}
		}
	}

	mouseUp(event) {
		if (this.finalScene) {
			return;
		}

		if (this.nonoScene) {
			if (this.pickedVoxel) {
				if (this.pickedVoxel.mesh.userData.actionSwitch) {
					this.nonoScene.toggleDrawAction();
				} else if (this.pickedVoxel.mesh.userData.voxelIndex !== undefined) {
					if (this.nonoScene.voxelData.isPuzzleSolved()) {
						this.finalScene = new FinalScene(this.assets, this.nonoScene.voxelData);
					}
				}
			} else {
				this.nonoScene = null;
			}
		} else if (this.pickScene) {
			if (this.pickedVoxel) {
				if (this.pickedVoxel.mesh.userData.voxelIndex !== undefined) {
					var pickedCell = this.pickScene.voxelData.getVoxelCell(this.pickedVoxel.mesh.userData.voxelIndex);
					this.nonoScene = new NonoScene(this.assets, this.pickScene.voxelData,
							pickedCell, this.pickedVoxel.faceNormal);
				}
			}
		}

		this.pickedVoxel = null;
	}
}

var container = document.getElementById("container");

var renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(this.renderer.domElement);

var voxelChallenge = new VoxelChallenge();

window.addEventListener("resize", () => {
	voxelChallenge.resizeViewport();
	renderer.setSize(window.innerWidth, window.innerHeight);
}, false);

container.addEventListener("mousedown", (event) => {
	voxelChallenge.mouseDown(event);
}, false);
container.addEventListener("mousemove", (event) => {
	voxelChallenge.mouseMove(event);
}, false);
container.addEventListener("mouseup", (event) => {
	voxelChallenge.mouseUp(event);
}, false);
container.addEventListener("touchstart", (event) => {
	event.preventDefault();
	event = event.changedTouches[0];
	voxelChallenge.mouseDown(event);
}, false);
container.addEventListener("touchmove", (event) => {
	event.preventDefault();
	event = event.changedTouches[0];
	voxelChallenge.mouseMove(event);
}, false);
container.addEventListener("touchend", (event) => {
	event.preventDefault();
	event = event.changedTouches[0];
	voxelChallenge.mouseUp(event);
}, false);

function animate() {
	requestAnimationFrame(animate);

	voxelChallenge.render(renderer);
}

animate();
