using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class Futile : MonoBehaviour
{
	public delegate void FutileUpdateDelegate();

	public static Futile instance = null;

	public static FScreen screen;

	public static FAtlasManager atlasManager;

	public static FStage stage;

	public static FTouchManager touchManager;

	public static bool isOpenGL;

	public static int baseRenderQueueDepth = 3000;

	public static bool shouldRemoveAtlasElementFileExtensions = true;

	public static bool subjectToAspectRatioIrregularity;

	public static float resourceScale;

	public static float resourceScaleInverse;

	public static Vector2 screenPixelOffset = Vector2.zero;

	public static string resourceSuffix;

	public static FAtlasElement whiteElement;

	public static Color white = Color.white;

	private static Vector3 _mousePosition = Vector3.zero;

	private static bool _mousePositionValid = false;

	internal static int nextRenderLayerDepth = 0;

	private static List<FStage> _stages;

	private static bool _isDepthChangeNeeded = false;

	public bool shouldTrackNodesInRXProfiler;

	private GameObject _cameraHolder;

	private Camera _camera;

	private GameObject _cameraHolder2;

	private Camera _camera2;

	[SerializeField]
	private RawImage _cameraImage;

	private bool splitScreen;

	private bool _shouldRunGCNextUpdate;

	private FutileParams _futileParams;

	private List<FDelayedCallback> _delayedCallbacks = new List<FDelayedCallback>();

	private CanvasScaler canvasScaler;

	public static float displayScale
	{
		get
		{
			return 1f;
		}
		set
		{
		}
	}

	public static float displayScaleInverse
	{
		get
		{
			return 1f;
		}
		set
		{
		}
	}

	public static Vector3 mousePosition
	{
		get
		{
			if (!_mousePositionValid)
			{
				_mousePositionValid = true;
				Vector3 vector = Input.mousePosition;
				_mousePosition.x = vector.x * (float)screen.pixelWidth / (float)Screen.width;
				_mousePosition.y = vector.y * (float)screen.pixelHeight / (float)Screen.height;
			}
			return _mousePosition;
		}
	}

	public Camera camera => _camera;

	public Camera camera2 => _camera2;

	[Obsolete("Futile.originX is obsolete, use Futile.screen.originX instead")]
	public float originX
	{
		get
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.originX instead");
		}
		set
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.originX instead");
		}
	}

	[Obsolete("Futile.originY is obsolete, use Futile.screen.originY instead")]
	public float originY
	{
		get
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.originY instead");
		}
		set
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.originY instead");
		}
	}

	[Obsolete("Futile.currentOrientation is obsolete, use Futile.screen.currentOrientation instead")]
	public ScreenOrientation currentOrientation
	{
		get
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.currentOrientation instead");
		}
		set
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.currentOrientation instead");
		}
	}

	[Obsolete("Futile.width is obsolete, use Futile.screen.width instead")]
	public static float width
	{
		get
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.width instead");
		}
		set
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.width instead");
		}
	}

	[Obsolete("Futile.height is obsolete, use Futile.screen.height instead")]
	public static float height
	{
		get
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.height instead");
		}
		set
		{
			throw new NotSupportedException("Obsolete! Use Futile.screen.height instead");
		}
	}

	public event FutileUpdateDelegate SignalUpdate;

	public event FutileUpdateDelegate SignalAfterUpdate;

	public event FutileUpdateDelegate SignalFixedUpdate;

	public event FutileUpdateDelegate SignalLateUpdate;

	private void Awake()
	{
		instance = this;
		isOpenGL = SystemInfo.graphicsDeviceVersion.Contains("OpenGL");
		base.enabled = false;
		base.name = "Futile";
	}

	public void Init(FutileParams futileParams)
	{
		base.enabled = true;
		_futileParams = futileParams;
		Application.targetFrameRate = _futileParams.targetFrameRate;
		FShader.Init();
		FFacetType.Init();
		screen = new FScreen(_futileParams);
		_cameraHolder = new GameObject();
		_cameraHolder.transform.parent = base.gameObject.transform;
		_camera = _cameraHolder.AddComponent<Camera>();
		InitCamera(_camera, 1);
		if (splitScreen)
		{
			_cameraHolder2 = new GameObject();
			_cameraHolder2.transform.parent = base.gameObject.transform;
			_camera2 = _cameraHolder2.AddComponent<Camera>();
			InitCamera(_camera2, 2);
		}
		if (Display.main.systemWidth < 1366 || Display.main.systemHeight < 768)
		{
			screen.renderTexture.filterMode = FilterMode.Bilinear;
		}
		else
		{
			screen.renderTexture.filterMode = FilterMode.Point;
		}
		_cameraImage.texture = screen.renderTexture;
		canvasScaler = _cameraImage.GetComponentInParent<CanvasScaler>();
		UpdateCameraPosition();
		touchManager = new FTouchManager();
		atlasManager = new FAtlasManager();
		CreateDefaultAtlases();
		_stages = new List<FStage>();
		stage = new FStage("Futile.stage");
		AddStage(stage);
	}

	private void InitCamera(Camera camera, int playerNumber)
	{
		camera.tag = "MainCamera";
		camera.name = "Camera " + playerNumber;
		camera.clearFlags = CameraClearFlags.Color;
		camera.cullingMask = _camera.cullingMask & ~LayerMask.GetMask("UI");
		camera.nearClipPlane = 0f;
		camera.farClipPlane = 500f;
		camera.depth = 100f;
		camera.backgroundColor = _futileParams.backgroundColor;
		camera.allowHDR = false;
		camera.allowMSAA = false;
		camera.allowDynamicResolution = false;
		camera.useOcclusionCulling = false;
		camera.targetTexture = screen.renderTexture;
		if (splitScreen)
		{
			if (1 == playerNumber)
			{
				camera.rect = new Rect(0f, 0.5f, 1f, 1f);
			}
			else
			{
				camera.rect = new Rect(0f, 0f, 1f, 0.5f);
			}
		}
		else
		{
			camera.rect = new Rect(0f, 0f, 1f, 1f);
		}
		camera.orthographic = true;
		camera.orthographicSize = (float)(screen.pixelHeight / 2) * displayScaleInverse;
	}

	public void UpdateScreenWidth(int newWidth)
	{
		_cameraImage.texture = null;
		_camera.targetTexture = null;
		if (splitScreen)
		{
			_camera2.targetTexture = null;
		}
		screen.ReinitRenderTexture(newWidth);
		_camera.orthographicSize = (float)(screen.pixelHeight / 2) * displayScaleInverse;
		_camera.targetTexture = screen.renderTexture;
		if (splitScreen)
		{
			_camera2.orthographicSize = (float)(screen.pixelHeight / 2) * displayScaleInverse;
			_camera2.targetTexture = screen.renderTexture;
		}
		_cameraImage.texture = screen.renderTexture;
		UpdateCameraPosition();
	}

	public FDelayedCallback StartDelayedCallback(Action func, float delayTime)
	{
		if (delayTime <= 0f)
		{
			delayTime = 1E-05f;
		}
		FDelayedCallback fDelayedCallback = new FDelayedCallback(func, delayTime);
		_delayedCallbacks.Add(fDelayedCallback);
		return fDelayedCallback;
	}

	public void StopDelayedCall(Action func)
	{
		int num = _delayedCallbacks.Count;
		for (int i = 0; i < num; i++)
		{
			if (_delayedCallbacks[i].func == func)
			{
				_delayedCallbacks.RemoveAt(i);
				i--;
				num--;
			}
		}
	}

	public void StopDelayedCall(FDelayedCallback callToRemove)
	{
		_delayedCallbacks.Remove(callToRemove);
	}

	public void CreateDefaultAtlases()
	{
		Texture2D texture2D = new Texture2D(16, 16);
		texture2D.filterMode = FilterMode.Bilinear;
		texture2D.wrapMode = TextureWrapMode.Clamp;
		Color color = white;
		for (int i = 0; i < 16; i++)
		{
			for (int j = 0; j < 16; j++)
			{
				texture2D.SetPixel(j, i, color);
			}
		}
		texture2D.Apply();
		atlasManager.LoadAtlasFromTexture("Futile_White", texture2D, textureFromAsset: false);
		whiteElement = atlasManager.GetElementWithName("Futile_White");
	}

	public static void AddStage(FStage stageToAdd)
	{
		int num = _stages.IndexOf(stageToAdd);
		if (num == -1)
		{
			stageToAdd.HandleAddedToFutile();
			_stages.Add(stageToAdd);
			UpdateStageIndices();
		}
		else if (num != _stages.Count - 1)
		{
			_stages.RemoveAt(num);
			_stages.Add(stageToAdd);
			UpdateStageIndices();
		}
	}

	public static void AddStageAtIndex(FStage stageToAdd, int newIndex)
	{
		int num = _stages.IndexOf(stageToAdd);
		if (newIndex > _stages.Count)
		{
			newIndex = _stages.Count;
		}
		if (num == newIndex)
		{
			return;
		}
		if (num == -1)
		{
			stageToAdd.HandleAddedToFutile();
			_stages.Insert(newIndex, stageToAdd);
		}
		else
		{
			_stages.RemoveAt(num);
			if (num < newIndex)
			{
				_stages.Insert(newIndex - 1, stageToAdd);
			}
			else
			{
				_stages.Insert(newIndex, stageToAdd);
			}
		}
		UpdateStageIndices();
	}

	public static void RemoveStage(FStage stageToRemove)
	{
		stageToRemove.HandleRemovedFromFutile();
		stageToRemove.index = -1;
		_stages.Remove(stageToRemove);
		UpdateStageIndices();
	}

	public static void UpdateStageIndices()
	{
		int count = _stages.Count;
		for (int i = 0; i < count; i++)
		{
			_stages[i].index = i;
		}
		_isDepthChangeNeeded = true;
	}

	public void ClearLayersThatUseAtlas(FAtlas atlas)
	{
		int count = _stages.Count;
		for (int i = 0; i < count; i++)
		{
			_stages[i].renderer.ClearLayersThatUseAtlas(atlas);
		}
	}

	public static int GetStageCount()
	{
		return _stages.Count;
	}

	public static FStage GetStageAt(int index)
	{
		return _stages[index];
	}

	private void ProcessDelayedCallbacks()
	{
		int num = _delayedCallbacks.Count;
		for (int i = 0; i < num; i++)
		{
			FDelayedCallback fDelayedCallback = _delayedCallbacks[i];
			fDelayedCallback.timeRemaining -= Time.deltaTime;
			if (fDelayedCallback.timeRemaining < 0f)
			{
				fDelayedCallback.func();
				_delayedCallbacks.RemoveAt(i);
				i--;
				num--;
			}
		}
	}

	private void Update()
	{
		ProcessDelayedCallbacks();
		screen.Update();
		touchManager.Update();
		if (this.SignalUpdate != null)
		{
			this.SignalUpdate();
		}
		if (this.SignalAfterUpdate != null)
		{
			this.SignalAfterUpdate();
		}
		for (int i = 0; i < _stages.Count; i++)
		{
			_stages[i].Redraw(shouldForceDirty: false, _isDepthChangeNeeded);
		}
		_isDepthChangeNeeded = false;
		if (_shouldRunGCNextUpdate)
		{
			_shouldRunGCNextUpdate = false;
			GC.Collect();
		}
	}

	private void LateUpdate()
	{
		nextRenderLayerDepth = 0;
		for (int i = 0; i < _stages.Count; i++)
		{
			_stages[i].LateUpdate();
		}
		if (this.SignalLateUpdate != null)
		{
			this.SignalLateUpdate();
		}
		_mousePositionValid = false;
	}

	private void FixedUpdate()
	{
		if (this.SignalFixedUpdate != null)
		{
			this.SignalFixedUpdate();
		}
	}

	private void OnApplicationQuit()
	{
		instance = null;
	}

	private void OnDestroy()
	{
		instance = null;
	}

	public void UpdateCameraPosition()
	{
		_camera.orthographicSize = (float)(screen.pixelHeight / 2) * displayScaleInverse * (splitScreen ? 0.5f : 1f);
		float x = (screen.originX - 0.5f) * (float)(-screen.pixelWidth) * displayScaleInverse + screenPixelOffset.x;
		float y = (screen.originY - 0.5f) * (float)(-screen.pixelHeight) * displayScaleInverse - screenPixelOffset.y;
		_camera.transform.position = new Vector3(x, y, -10f);
		if (splitScreen)
		{
			_camera2.orthographicSize = (float)(screen.pixelHeight / 2) * displayScaleInverse * 0.5f;
			x = (screen.originX - 0.5f) * (float)(-screen.pixelWidth) * displayScaleInverse + screenPixelOffset.x - 6000f;
			y = (screen.originY - 0.5f) * (float)(-screen.pixelHeight) * displayScaleInverse - screenPixelOffset.y;
			_camera2.transform.position = new Vector3(x, y, -10f);
		}
		float num = canvasScaler.referenceResolution.x / canvasScaler.referenceResolution.y;
		float num2 = 1.77864587f;
		float num3 = num / num2;
		_cameraImage.uvRect = new Rect(0f, 0f, num3, num3);
		subjectToAspectRatioIrregularity = num3 != 1f;
	}

	public void ForceGarbageCollectionNextUpdate()
	{
		_shouldRunGCNextUpdate = true;
	}

	[Obsolete("Futile.IsLandscape() is obsolete, use Futile.screen.IsLandscape() instead")]
	public bool IsLandscape()
	{
		throw new NotSupportedException("Obsolete! Use Futile.screen.IsLandscape() instead");
	}
}
