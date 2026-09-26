using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using AssetBundles;
using RWCustom;
using UnityEngine;

public class SoundLoader
{
	public struct ClipLoadData
	{
		public bool audioClipThroughUnity;

		public AudioClip[] audio;

		public bool unityAudioCached;

		public string name;

		public int soundVariations
		{
			get
			{
				if (audio != null)
				{
					return audio.Length;
				}
				return 0;
			}
		}
	}

	private class VolumeGroup
	{
		public string name;

		public float vol;

		public List<int> affectLines;

		public VolumeGroup(string name, float vol)
		{
			this.name = name;
			this.vol = vol;
			affectLines = new List<int>();
		}
	}

	public struct SoundPlayInstruction
	{
		public int audioClip;

		public float minVol;

		public float maxVol;

		public float minPitch;

		public float maxPitch;

		public float ignoreEffects;

		public SoundPlayInstruction(int audioClip, string[] initStringSplit)
		{
			this.audioClip = audioClip;
			minVol = 1f;
			maxVol = 1f;
			minPitch = 1f;
			maxPitch = 1f;
			ignoreEffects = 0f;
			for (int i = 1; i < initStringSplit.Length; i++)
			{
				string[] array = Regex.Split(initStringSplit[i], "=");
				switch (array[0])
				{
				case "vol":
					minVol = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					maxVol = minVol;
					break;
				case "pitch":
					minPitch = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					maxPitch = minPitch;
					break;
				case "minVol":
					minVol = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "maxVol":
					maxVol = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "minPitch":
					minPitch = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "maxPitch":
					maxPitch = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "ignoreEffects":
					ignoreEffects = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				}
			}
		}
	}

	private class SoundTrigger
	{
		private SoundPlayInstruction[] sounds;

		public float GROUPVOL;

		private float minVol;

		private float maxVol;

		private float minPitch;

		private float maxPitch;

		private float range;

		private float dopplerFactor;

		private float ignoreEffects;

		public bool PlayAll;

		public bool DontLog;

		public float silentChance;

		public bool cache;

		public SoundID soundID;

		public int Instructions => sounds.Length;

		public SoundTrigger(SoundID soundID, SoundPlayInstruction[] sounds, float gVol, SoundLoader soundLoader, string[] initString)
		{
			this.soundID = soundID;
			this.sounds = sounds;
			GROUPVOL = gVol;
			minVol = GROUPVOL;
			maxVol = GROUPVOL;
			minPitch = 1f;
			maxPitch = 1f;
			PlayAll = false;
			DontLog = false;
			cache = false;
			range = 1f;
			dopplerFactor = 1f;
			for (int i = 1; i < initString.Length; i++)
			{
				string[] array = Regex.Split(initString[i], "=");
				switch (array[0])
				{
				case "vol":
					minVol = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture) * GROUPVOL;
					maxVol = minVol;
					break;
				case "pitch":
					minPitch = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					maxPitch = minPitch;
					break;
				case "minVol":
					minVol = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture) * GROUPVOL;
					break;
				case "maxVol":
					maxVol = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture) * GROUPVOL;
					break;
				case "minPitch":
					minPitch = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "maxPitch":
					maxPitch = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "ignoreEffects":
					ignoreEffects = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "rangeFac":
					range = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "dopplerFac":
					dopplerFactor = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "PLAYALL":
					PlayAll = true;
					break;
				case "DONTLOG":
					DontLog = true;
					break;
				case "silentChance":
					silentChance = float.Parse(array[1], NumberStyles.Any, CultureInfo.InvariantCulture);
					break;
				case "CACHE":
					cache = true;
					break;
				}
			}
			if (CacheAllAudio)
			{
				cache = true;
			}
		}

		public SoundData GetRandomSoundData()
		{
			return GetSoundData(Random.Range(0, sounds.Length));
		}

		public SoundData GetSoundData(int i)
		{
			SoundPlayInstruction soundPlayInstruction = sounds[i];
			SoundData result = new SoundData(soundID, soundPlayInstruction.audioClip, Mathf.Lerp(soundPlayInstruction.minVol, soundPlayInstruction.maxVol, Random.value) * Mathf.Lerp(minVol, maxVol, Random.value), Mathf.Lerp(soundPlayInstruction.minPitch, soundPlayInstruction.maxPitch, Random.value) * Mathf.Lerp(minPitch, maxPitch, Random.value), range, dopplerFactor);
			result.ignoreEffects = Mathf.Lerp(soundPlayInstruction.ignoreEffects, 1f, ignoreEffects);
			return result;
		}
	}

	public struct SoundData
	{
		public SoundID soundID;

		public int audioClip;

		public float vol;

		public float pitch;

		public float range;

		public float dopplerFac;

		public float ignoreEffects;

		public bool dontAutoPlay;

		public string soundName;

		public SoundData(SoundID soundID, int audioClip, float vol, float pitch, float range, float dopplerFac)
		{
			this.soundID = soundID;
			this.audioClip = audioClip;
			this.vol = vol;
			this.pitch = pitch;
			this.range = range;
			this.dopplerFac = dopplerFac;
			ignoreEffects = 0f;
			soundName = "";
			dontAutoPlay = false;
		}
	}

	public class SoundImporter : MonoBehaviour
	{
		public class ClipAndIndex
		{
			public AudioClip clip;

			public IntVector2 index;

			public ClipAndIndex(IntVector2 index, AudioClip clip)
			{
				this.index = index;
				this.clip = clip;
			}
		}

		public List<ClipAndIndex> loadingClips = new List<ClipAndIndex>();

		private string[] fileTypes = new string[2] { ".ogg", ".wav" };

		private SoundLoader owner;

		public void Init(SoundLoader owner)
		{
			this.owner = owner;
			reloadSounds();
		}

		private void reloadSounds()
		{
			string[] array = AssetManager.ListDirectory("soundeffects");
			int num = 0;
			string[] array2 = array;
			foreach (string text in array2)
			{
				if (!validFileType(text))
				{
					continue;
				}
				string text2 = Path.GetFileNameWithoutExtension(text);
				bool flag = false;
				string[] array3 = text2.Split('_');
				if (array3.Length > 1 && int.TryParse(array3[array3.Length - 1], NumberStyles.Any, CultureInfo.InvariantCulture, out var result))
				{
					text2 = string.Join("_", array3.Take(array3.Length - 1));
					flag = true;
				}
				else
				{
					result = 1;
				}
				int num2 = -1;
				for (int j = 0; j < owner.allAudio.Length; j++)
				{
					if (!owner.allAudio[j].audioClipThroughUnity && string.Compare(owner.allAudio[j].name, text2, ignoreCase: true) == 0)
					{
						num2 = j;
						break;
					}
				}
				if (num2 > -1)
				{
					Custom.LogImportant("load audio file " + text2);
					StartCoroutine(loadFile(text, text2 + (flag ? ("_" + result) : ""), new IntVector2(num2, result - 1)));
					num++;
				}
			}
			owner.errors.Add("Initiating import of " + num + " samples");
			Custom.Log("------- Initiating import of", num.ToString(), "samples");
		}

		private bool validFileType(string filename)
		{
			string[] array = fileTypes;
			foreach (string value in array)
			{
				if (filename.EndsWith(value))
				{
					return true;
				}
			}
			return false;
		}

		private IEnumerator loadFile(string path, string name, IntVector2 index)
		{
			WWW www = new WWW("file://" + path);
			AudioClip myAudioClip = www.GetAudioClip();
			while (myAudioClip.loadState != AudioDataLoadState.Loaded && myAudioClip.loadState != AudioDataLoadState.Failed)
			{
				yield return www;
			}
			AudioClip audioClip = www.GetAudioClip(threeD: false);
			audioClip.name = name;
			loadingClips.Add(new ClipAndIndex(index, audioClip));
		}
	}

	public class AmbientImporter : MonoBehaviour
	{
		public string fileName;

		public AudioClip loadedClip;

		private string[] fileTypes = new string[2] { "ogg", "wav" };

		private bool isWav;

		public bool initiated;

		public void Init(SoundLoader owner)
		{
			initiated = true;
			string[] array = AssetManager.ListDirectory("soundeffects/ambient");
			foreach (string text in array)
			{
				if (validFileType(text) && Path.GetFileName(text) == fileName)
				{
					StartCoroutine(loadFile(this, text, base.name));
					break;
				}
			}
		}

		private bool validFileType(string filename)
		{
			string[] array = fileTypes;
			foreach (string text in array)
			{
				if (filename.IndexOf(text) > -1)
				{
					isWav = text == "wav";
					return true;
				}
			}
			return false;
		}

		private IEnumerator loadFile(AmbientImporter importer, string path, string name)
		{
			WWW www = new WWW("file://" + path);
			AudioClip myAudioClip = www.GetAudioClip(threeD: false, stream: false, isWav ? AudioType.WAV : AudioType.OGGVORBIS);
			while (myAudioClip.loadState != AudioDataLoadState.Loaded && myAudioClip.loadState != AudioDataLoadState.Failed)
			{
				yield return www;
			}
			myAudioClip.name = name;
			importer.loadedClip = myAudioClip;
		}
	}

	private static readonly AGLog<SoundLoader> Log = new AGLog<SoundLoader>();

	public const string ASSETBUNDLE_LOADEDSOUNDEFFECTS = "loadedsoundeffects";

	public const string ASSETBUNDLE_LOADEDSOUNDEFFECTS_AMBIENT = "loadedsoundeffects_ambient";

	public static readonly bool CacheAllAudio = true;

	private RainWorld rainWorld;

	public bool[] workingTriggers;

	private ClipLoadData[] allAudio;

	private AssetBundleLoadAssetOperation[][] unityAudioLoaders;

	public List<AudioClip> ambientClipsThroughUnity;

	public List<AmbientImporter> ambientImporters;

	private Dictionary<string, AssetBundleLoadAssetOperation> ambientClipsThroughUnityLoaders;

	private SoundTrigger[] soundTriggers;

	public float volume;

	public float volumeExponent;

	public bool loadingDone;

	private SoundImporter soundImporter;

	private GameObject gameObject;

	private int clipsToBeLoaded;

	private bool requestedAssetBundlesLoad;

	private LoadedAssetBundle loadedSoundEffectsAssetBundle;

	private LoadedAssetBundle loadedSoundEffectsAmbientAssetBundle;

	private bool requestLoadSounds;

	private bool requestLoadAmbientSounds;

	private bool requestReleaseUnityAudio;

	private List<VolumeGroup> volumeGroups;

	public List<string> errors;

	public bool assetBundlesLoaded { get; private set; }

	public SoundLoader(bool loadAllAmbientSounds, RainWorld rainWorld)
	{
		Custom.Log("INIT SOUND LOADER");
		this.rainWorld = rainWorld;
		ambientImporters = new List<AmbientImporter>();
		ambientClipsThroughUnity = new List<AudioClip>();
		ambientClipsThroughUnityLoaders = new Dictionary<string, AssetBundleLoadAssetOperation>();
		LoadSounds();
		if (requestLoadSounds)
		{
			string text = AssetManager.ResolveFilePath("SoundEffects" + Path.DirectorySeparatorChar + "Sounds.txt");
			Custom.Log(text);
			string[] array = File.ReadAllLines(text);
			volume = float.Parse(Regex.Split(array[0], ": ")[1], NumberStyles.Any, CultureInfo.InvariantCulture);
			volumeExponent = float.Parse(Regex.Split(array[1], ": ")[1], NumberStyles.Any, CultureInfo.InvariantCulture);
		}
		if (loadAllAmbientSounds)
		{
			LoadAllAmbientSounds();
		}
	}

	public void ReleaseAllUnityAudio()
	{
		if (!assetBundlesLoaded)
		{
			requestReleaseUnityAudio = true;
			return;
		}
		for (int i = 0; i < allAudio.Length; i++)
		{
			if (allAudio[i].audio != null && !allAudio[i].unityAudioCached && allAudio[i].audioClipThroughUnity)
			{
				for (int j = 0; j < allAudio[i].audio.Length; j++)
				{
					allAudio[i].audio[j] = null;
				}
			}
		}
		for (int k = 0; k < unityAudioLoaders.Length; k++)
		{
			if (unityAudioLoaders[k] != null && !allAudio[k].unityAudioCached)
			{
				for (int l = 0; l < unityAudioLoaders[k].Length; l++)
				{
					unityAudioLoaders[k][l] = null;
				}
			}
		}
		ambientImporters.Clear();
		ambientClipsThroughUnity.Clear();
		ambientClipsThroughUnityLoaders.Clear();
	}

	public void Update()
	{
		if (!assetBundlesLoaded && rainWorld.assetBundlesInitialized)
		{
			if (!requestedAssetBundlesLoad)
			{
				requestedAssetBundlesLoad = true;
				AssetBundleManager.LoadAssetBundle("loadedsoundeffects");
				AssetBundleManager.LoadAssetBundle("loadedsoundeffects_ambient");
			}
			else
			{
				string error;
				LoadedAssetBundle loadedAssetBundle = AssetBundleManager.GetLoadedAssetBundle("loadedsoundeffects", out error);
				LoadedAssetBundle loadedAssetBundle2 = AssetBundleManager.GetLoadedAssetBundle("loadedsoundeffects_ambient", out error);
				if (loadedAssetBundle != null && loadedAssetBundle2 != null)
				{
					loadedSoundEffectsAssetBundle = loadedAssetBundle;
					loadedSoundEffectsAmbientAssetBundle = loadedAssetBundle2;
					assetBundlesLoaded = true;
				}
			}
		}
		if (requestLoadSounds && assetBundlesLoaded)
		{
			requestLoadSounds = false;
			LoadSounds();
		}
		if (requestLoadAmbientSounds && assetBundlesLoaded)
		{
			requestLoadAmbientSounds = false;
			LoadAllAmbientSounds();
		}
		if (requestReleaseUnityAudio && assetBundlesLoaded)
		{
			requestReleaseUnityAudio = false;
			ReleaseAllUnityAudio();
		}
		if (assetBundlesLoaded)
		{
			for (int i = 0; i < unityAudioLoaders.Length; i++)
			{
				if (unityAudioLoaders[i] == null)
				{
					continue;
				}
				for (int j = 0; j < unityAudioLoaders[i].Length; j++)
				{
					if (unityAudioLoaders[i][j] != null && unityAudioLoaders[i][j].IsDone())
					{
						if (i < allAudio.Length && allAudio[i].audioClipThroughUnity && j < allAudio[i].audio.Length)
						{
							allAudio[i].audio[j] = unityAudioLoaders[i][j].GetAsset<AudioClip>();
						}
						unityAudioLoaders[i][j] = null;
					}
				}
			}
			if (ambientClipsThroughUnityLoaders.Count > 0)
			{
				List<string> list = null;
				foreach (KeyValuePair<string, AssetBundleLoadAssetOperation> ambientClipsThroughUnityLoader in ambientClipsThroughUnityLoaders)
				{
					if (ambientClipsThroughUnityLoader.Value.IsDone())
					{
						if (list == null)
						{
							list = new List<string>();
						}
						list.Add(ambientClipsThroughUnityLoader.Key);
						AudioClip asset = ambientClipsThroughUnityLoader.Value.GetAsset<AudioClip>();
						asset.name = ambientClipsThroughUnityLoader.Key;
						ambientClipsThroughUnity.Add(asset);
					}
				}
				if (list != null)
				{
					for (int k = 0; k < list.Count; k++)
					{
						ambientClipsThroughUnityLoaders.Remove(list[k]);
					}
				}
			}
		}
		if (!(soundImporter != null) || !assetBundlesLoaded)
		{
			return;
		}
		for (int num = soundImporter.loadingClips.Count - 1; num >= 0; num--)
		{
			if (soundImporter.loadingClips[num].clip.loadState == AudioDataLoadState.Loaded || soundImporter.loadingClips[num].clip.loadState == AudioDataLoadState.Failed)
			{
				allAudio[soundImporter.loadingClips[num].index.x].audio[soundImporter.loadingClips[num].index.y] = soundImporter.loadingClips[num].clip;
				soundImporter.loadingClips.RemoveAt(num);
				clipsToBeLoaded--;
			}
		}
		if (clipsToBeLoaded < 1)
		{
			Custom.Log("All clips loaded and assigned!");
			soundImporter = null;
			Object.Destroy(gameObject);
			gameObject = null;
			loadingDone = true;
		}
	}

	private void RecordLineToVolumeGroups(List<VolumeGroup> activeVolumeGroups, int l)
	{
		foreach (VolumeGroup activeVolumeGroup in activeVolumeGroups)
		{
			activeVolumeGroup.affectLines.Add(l);
		}
	}

	private void VolumeGroupStopRecording(List<VolumeGroup> activeVolumeGroups, string name)
	{
		foreach (VolumeGroup activeVolumeGroup in activeVolumeGroups)
		{
			if (activeVolumeGroup.name == name)
			{
				activeVolumeGroups.Remove(activeVolumeGroup);
				break;
			}
		}
	}

	public float GroupVolume(int line)
	{
		float num = 1f;
		foreach (VolumeGroup volumeGroup in volumeGroups)
		{
			if (volumeGroup.affectLines.IndexOf(line) > -1)
			{
				num *= volumeGroup.vol;
			}
		}
		return num;
	}

	public void LoadSounds()
	{
		if (!assetBundlesLoaded)
		{
			requestLoadSounds = true;
			return;
		}
		errors = new List<string>();
		Custom.Log("Loading sounds");
		string[] array = File.ReadAllLines(AssetManager.ResolveFilePath("SoundEffects" + Path.DirectorySeparatorChar + "Sounds.txt"));
		volume = float.Parse(Regex.Split(array[0], ": ")[1], NumberStyles.Any, CultureInfo.InvariantCulture);
		volumeExponent = float.Parse(Regex.Split(array[1], ": ")[1], NumberStyles.Any, CultureInfo.InvariantCulture);
		volumeGroups = new List<VolumeGroup>();
		List<VolumeGroup> list = new List<VolumeGroup>();
		List<int> list2 = new List<int>();
		for (int i = 0; i < array.Length; i++)
		{
			string[] array2 = Regex.Split(array[i], " : ");
			if (array2[0] == "START VOLUME GROUP")
			{
				volumeGroups.Add(new VolumeGroup(array2[1], float.Parse(array2[2], NumberStyles.Any, CultureInfo.InvariantCulture)));
				list.Add(volumeGroups[volumeGroups.Count - 1]);
			}
			if (array2[0] == "END VOLUME GROUP")
			{
				VolumeGroupStopRecording(list, array2[1]);
			}
			else if (array2.Length == 2 && (array2[0][0] != '/' || array2[0][1] != '/'))
			{
				list2.Add(i);
				RecordLineToVolumeGroups(list, i);
			}
		}
		int count = ExtEnum<SoundID>.values.Count;
		soundTriggers = new SoundTrigger[count];
		workingTriggers = new bool[count];
		List<string> list3 = new List<string>();
		List<bool> list4 = new List<bool>();
		Dictionary<string, int> dictionary = new Dictionary<string, int>();
		Dictionary<int, string[]> dictionary2 = new Dictionary<int, string[]>();
		Dictionary<int, string[]> dictionary3 = new Dictionary<int, string[]>();
		Dictionary<int, string> dictionary4 = new Dictionary<int, string>();
		for (int j = 0; j < count; j++)
		{
			SoundID soundID = new SoundID(ExtEnum<SoundID>.values.GetEntry(j));
			string text = soundID.ToString().ToLowerInvariant();
			for (int k = 0; k < list2.Count; k++)
			{
				string[] array3;
				string[] array4;
				string text2;
				if (dictionary2.ContainsKey(list2[k]))
				{
					array3 = dictionary2[list2[k]];
					array4 = dictionary3[list2[k]];
					text2 = dictionary4[list2[k]];
				}
				else
				{
					array3 = Regex.Split(array[list2[k]], " : ");
					array4 = Regex.Split(array3[0], "/");
					text2 = array4[0].ToLowerInvariant();
					dictionary2.Add(list2[k], array3);
					dictionary3.Add(list2[k], array4);
					dictionary4.Add(list2[k], text2);
				}
				if (array3.Length == 0 || !(text2 == text))
				{
					continue;
				}
				bool flag = false;
				List<SoundPlayInstruction> list5 = new List<SoundPlayInstruction>();
				string[] array5 = Regex.Split(Custom.ValidateSpacedDelimiter(array3[1], ","), ", ");
				for (int l = 0; l < array5.Length; l++)
				{
					string[] array6 = Regex.Split(array5[l], "/");
					string text3 = array6[0];
					string text4 = text3.ToLowerInvariant();
					if (text4 == "samename")
					{
						text3 = array4[0];
						text4 = text3.ToLowerInvariant();
					}
					int num = -1;
					if (dictionary.ContainsKey(text4))
					{
						num = dictionary[text4];
					}
					if (num == -1)
					{
						if (CheckIfFileExistsAsUnityResource(text3))
						{
							list3.Add(text3);
							list4.Add(item: true);
							num = list3.Count - 1;
							dictionary.Add(text4, num);
						}
						else
						{
							if (!CheckIfFileExistsAsExternal(text3))
							{
								if (text3 != "")
								{
									errors.Add("Can't find file: " + text3);
								}
								else
								{
									errors.Add("Empty sound file name in: " + soundID);
								}
								flag = true;
								break;
							}
							list3.Add(text3);
							list4.Add(item: false);
							num = list3.Count - 1;
							dictionary.Add(text4, num);
						}
					}
					list5.Add(new SoundPlayInstruction(num, array6));
				}
				if (!flag)
				{
					soundTriggers[j] = new SoundTrigger(soundID, list5.ToArray(), GroupVolume(list2[k]), this, array4);
					workingTriggers[j] = true;
				}
				dictionary2.Remove(list2[k]);
				dictionary3.Remove(list2[k]);
				dictionary4.Remove(list2[k]);
				list2.RemoveAt(k);
				break;
			}
		}
		if (list2.Count > 0)
		{
			errors.Add("Non existent triggers:");
			for (int m = 0; m < list2.Count; m++)
			{
				errors.Add("     " + array[list2[m]]);
			}
		}
		unityAudioLoaders = new AssetBundleLoadAssetOperation[list3.Count][];
		allAudio = new ClipLoadData[list3.Count];
		for (int n = 0; n < list3.Count; n++)
		{
			int num2 = VariationsForSound(list3[n]);
			if (list4[n])
			{
				allAudio[n] = new ClipLoadData
				{
					audioClipThroughUnity = true,
					audio = new AudioClip[num2],
					name = list3[n]
				};
				unityAudioLoaders[n] = new AssetBundleLoadAssetOperation[num2];
			}
			else
			{
				allAudio[n] = new ClipLoadData
				{
					audioClipThroughUnity = false,
					audio = new AudioClip[num2],
					name = list3[n]
				};
			}
		}
		SoundTrigger soundTrigger = soundTriggers.FirstOrDefault((SoundTrigger st) => st != null && st.soundID == SoundID.MENU_Main_Menu_LOOP);
		if (CacheAllAudio)
		{
			for (int num3 = 0; num3 < allAudio.Length; num3++)
			{
				if (allAudio[num3].audioClipThroughUnity)
				{
					allAudio[num3].unityAudioCached = true;
					_ = ref allAudio[num3];
					for (int num4 = 0; num4 < allAudio[num3].soundVariations; num4++)
					{
						AddUnityAudioToLoad(num3, num4);
					}
				}
			}
		}
		else
		{
			for (int num5 = 0; num5 < soundTriggers.Length; num5++)
			{
				if (soundTriggers[num5] != null)
				{
					_ = soundTriggers[num5];
				}
				if (soundTriggers[num5] == null || !soundTriggers[num5].cache)
				{
					continue;
				}
				for (int num6 = 0; num6 < soundTriggers[num5].Instructions; num6++)
				{
					int audioClip = soundTriggers[num5].GetSoundData(num6).audioClip;
					if (allAudio[audioClip].audioClipThroughUnity)
					{
						allAudio[audioClip].unityAudioCached = true;
						for (int num7 = 0; num7 < allAudio[audioClip].soundVariations; num7++)
						{
							AddUnityAudioToLoad(audioClip, num7);
						}
					}
				}
			}
		}
		if (gameObject != null)
		{
			Object.Destroy(gameObject);
			gameObject = null;
		}
		gameObject = new GameObject("SoundLoader");
		soundImporter = gameObject.AddComponent<SoundImporter>();
		soundImporter.Init(this);
		clipsToBeLoaded = 0;
		for (int num8 = 0; num8 < allAudio.Length; num8++)
		{
			if (!allAudio[num8].audioClipThroughUnity)
			{
				clipsToBeLoaded += allAudio[num8].soundVariations;
			}
		}
	}

	private void AddUnityAudioToLoad(int audioClip, int variation)
	{
		string text = allAudio[audioClip].name;
		if (allAudio[audioClip].soundVariations > 1)
		{
			text = text + "_" + (1 + variation);
		}
		if (allAudio[audioClip].audio != null && !(allAudio[audioClip].audio[variation] != null) && allAudio[audioClip].audioClipThroughUnity && unityAudioLoaders[audioClip][variation] == null)
		{
			unityAudioLoaders[audioClip][variation] = AssetBundleManager.LoadAssetAsync("loadedsoundeffects", text, typeof(AudioClip));
		}
	}

	private bool CheckIfFileExistsAsExternal(string name)
	{
		if (!File.Exists(AssetManager.ResolveFilePath("SoundEffects" + Path.DirectorySeparatorChar + name + ".wav")) && !File.Exists(AssetManager.ResolveFilePath("SoundEffects" + Path.DirectorySeparatorChar + name + "_1.wav")) && !File.Exists(AssetManager.ResolveFilePath("SoundEffects" + Path.DirectorySeparatorChar + name + ".ogg")))
		{
			return File.Exists(AssetManager.ResolveFilePath("SoundEffects" + Path.DirectorySeparatorChar + name + "_1.ogg"));
		}
		return true;
	}

	private bool CheckIfFileExistsAsUnityResource(string name)
	{
		if (!loadedSoundEffectsAssetBundle.m_AssetBundle.Contains(name))
		{
			return loadedSoundEffectsAssetBundle.m_AssetBundle.Contains(name + "_1");
		}
		return true;
	}

	private int VariationsForSound(string name)
	{
		int num = 1;
		if (CheckIfFileExistsAsUnityResource(name))
		{
			for (int i = 0; i < 100; i++)
			{
				if (!loadedSoundEffectsAssetBundle.m_AssetBundle.Contains(name + "_" + (num + 1)))
				{
					break;
				}
				num++;
			}
		}
		else
		{
			for (int j = 0; j < 100; j++)
			{
				if (!File.Exists(AssetManager.ResolveFilePath("SoundEffects" + Path.DirectorySeparatorChar + name + "_" + (num + 1) + ".wav")))
				{
					break;
				}
				num++;
			}
		}
		return num;
	}

	public bool ShouldSoundPlay(SoundID soundID)
	{
		if (!assetBundlesLoaded)
		{
			return false;
		}
		if (soundID == null || soundID.Index == -1 || !workingTriggers[soundID.Index])
		{
			return false;
		}
		if (soundTriggers[soundID.Index].silentChance == 0f)
		{
			return true;
		}
		return Random.value > soundTriggers[soundID.Index].silentChance;
	}

	public SoundData GetSoundData(SoundID soundID)
	{
		if (soundID == null || soundID.Index == -1)
		{
			return new SoundData(SoundID.None, 0, 0f, 0f, 0f, 0f);
		}
		return soundTriggers[soundID.Index].GetRandomSoundData();
	}

	public SoundData GetSoundData(SoundID soundID, int i)
	{
		if (soundID == null || soundID.Index == -1)
		{
			return new SoundData(SoundID.None, 0, 0f, 0f, 0f, 0f);
		}
		return soundTriggers[soundID.Index].GetSoundData(i);
	}

	public bool TriggerPlayAll(SoundID soundID)
	{
		if (soundID == null || soundID.Index == -1)
		{
			return false;
		}
		return soundTriggers[soundID.Index].PlayAll;
	}

	public int TriggerSamples(SoundID soundID)
	{
		if (soundID == null || soundID.Index == -1)
		{
			return 0;
		}
		return soundTriggers[soundID.Index].Instructions;
	}

	public float TriggerGroupVolume(SoundID soundID)
	{
		if (soundID == null || soundID.Index == -1)
		{
			return 0f;
		}
		return soundTriggers[soundID.Index].GROUPVOL;
	}

	public bool DontLog(SoundID soundID)
	{
		if (!assetBundlesLoaded || soundID == null || soundID.Index == -1)
		{
			return true;
		}
		return soundTriggers[soundID.Index].DontLog;
	}

	public AudioClip GetAudioClip(int i, out AssetBundleLoadAssetOperation loadOp, out string name)
	{
		loadOp = null;
		if (allAudio[i].audioClipThroughUnity)
		{
			int num = Random.Range(0, allAudio[i].soundVariations);
			name = allAudio[i].name;
			if (allAudio[i].soundVariations > 1)
			{
				name = name + "_" + (1 + num);
			}
			if (allAudio[i].audio[num] != null)
			{
				return allAudio[i].audio[num];
			}
			string text = "LoadedSoundEffects" + Path.DirectorySeparatorChar + name + ".wav";
			string text2 = AssetManager.ResolveFilePath(text);
			if (text2 != Path.Combine(Custom.RootFolderDirectory(), text.ToLowerInvariant()) && !File.Exists(text2))
			{
				text2 = AssetManager.ResolveFilePath("LoadedSoundEffects" + Path.DirectorySeparatorChar + name + ".ogg");
			}
			if (text2 != Path.Combine(Custom.RootFolderDirectory(), text.ToLowerInvariant()) && File.Exists(text2))
			{
				allAudio[i].audio[num] = AssetManager.SafeWWWAudioClip("file://" + text2, threeD: false, stream: true, text2.EndsWith("ogg") ? AudioType.OGGVORBIS : AudioType.WAV);
				return allAudio[i].audio[num];
			}
			if (unityAudioLoaders[i][num] != null)
			{
				if (unityAudioLoaders[i][num].IsDone())
				{
					allAudio[i].audio[num] = unityAudioLoaders[i][num].GetAsset<AudioClip>();
					unityAudioLoaders[i][num] = null;
					return allAudio[i].audio[num];
				}
				loadOp = unityAudioLoaders[i][num];
				return null;
			}
			string error;
			LoadedAssetBundle loadedAssetBundle = AssetBundleManager.GetLoadedAssetBundle("loadedsoundeffects", out error);
			if (loadedAssetBundle != null)
			{
				allAudio[i].audio[num] = loadedAssetBundle.m_AssetBundle.LoadAsset<AudioClip>(name);
				return allAudio[i].audio[num];
			}
			unityAudioLoaders[i][num] = AssetBundleManager.LoadAssetAsync("loadedsoundeffects", name, typeof(AudioClip));
			loadOp = unityAudioLoaders[i][num];
			return null;
		}
		AudioClip audioClip = allAudio[i].audio[Random.Range(0, allAudio[i].soundVariations)];
		name = audioClip.name;
		return audioClip;
	}

	public void LoadAllAmbientSounds()
	{
		if (!assetBundlesLoaded)
		{
			requestLoadAmbientSounds = true;
			return;
		}
		string[] array = AssetManager.ListDirectory("soundeffects/ambient");
		for (int i = 0; i < array.Length; i++)
		{
			RequestAmbientAudioClip(Path.GetFileName(array[i]));
		}
	}

	public AudioClip RequestAmbientAudioClip(string clipName)
	{
		string text = "LoadedSoundEffects" + Path.DirectorySeparatorChar + "Ambient" + Path.DirectorySeparatorChar + clipName;
		string text2 = AssetManager.ResolveFilePath(text);
		if (text2 != Path.Combine(Custom.RootFolderDirectory(), text.ToLowerInvariant()) && File.Exists(text2))
		{
			for (int i = 0; i < ambientClipsThroughUnity.Count; i++)
			{
				if (ambientClipsThroughUnity[i].name == clipName)
				{
					return ambientClipsThroughUnity[i];
				}
			}
			AudioClip audioClip = AssetManager.SafeWWWAudioClip("file://" + text2, threeD: false, stream: true, text2.ToLower().EndsWith("wav") ? AudioType.WAV : AudioType.OGGVORBIS);
			audioClip.name = clipName;
			ambientClipsThroughUnity.Add(audioClip);
			return audioClip;
		}
		if (loadedSoundEffectsAmbientAssetBundle.m_AssetBundle.Contains(clipName))
		{
			for (int j = 0; j < ambientClipsThroughUnity.Count; j++)
			{
				if (ambientClipsThroughUnity[j].name == clipName)
				{
					return ambientClipsThroughUnity[j];
				}
			}
			if (ambientClipsThroughUnityLoaders.ContainsKey(clipName))
			{
				AssetBundleLoadAssetOperation assetBundleLoadAssetOperation = ambientClipsThroughUnityLoaders[clipName];
				if (assetBundleLoadAssetOperation.IsDone())
				{
					AudioClip asset = assetBundleLoadAssetOperation.GetAsset<AudioClip>();
					asset.name = clipName;
					ambientClipsThroughUnity.Add(asset);
					ambientClipsThroughUnityLoaders.Remove(clipName);
					return asset;
				}
				return null;
			}
			string error;
			LoadedAssetBundle loadedAssetBundle = AssetBundleManager.GetLoadedAssetBundle("loadedsoundeffects_ambient", out error);
			if (loadedAssetBundle != null)
			{
				AudioClip audioClip2 = loadedAssetBundle.m_AssetBundle.LoadAsset<AudioClip>(clipName.Substring(0, clipName.Length - 4));
				ambientClipsThroughUnity.Add(audioClip2);
				return audioClip2;
			}
			ambientClipsThroughUnityLoaders.Add(clipName, AssetBundleManager.LoadAssetAsync("loadedsoundeffects_ambient", clipName.Substring(0, clipName.Length - 4), typeof(AudioClip)));
			return null;
		}
		for (int k = 0; k < ambientImporters.Count; k++)
		{
			if (ambientImporters[k].fileName == clipName)
			{
				return ambientImporters[k].loadedClip;
			}
		}
		if (gameObject == null)
		{
			gameObject = new GameObject("SoundLoader");
		}
		AmbientImporter ambientImporter = gameObject.AddComponent<AmbientImporter>();
		ambientImporter.fileName = clipName;
		ambientImporters.Add(ambientImporter);
		ambientImporter.Init(this);
		return null;
	}
}
