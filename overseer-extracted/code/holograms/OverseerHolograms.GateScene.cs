using System.Collections.Generic;
using RWCustom;
using UnityEngine;

namespace OverseerHolograms;

public class GateScene : OverseerHologram
{
	public class SceneID : ExtEnum<SceneID>
	{
		public static readonly SceneID MoonAndSlugcats = new SceneID("MoonAndSlugcats", register: true);

		public static readonly SceneID MoonGiveMark = new SceneID("MoonGiveMark", register: true);

		public static readonly SceneID FullStory = new SceneID("FullStory", register: true);

		public SceneID(string value, bool register = false)
			: base(value, register)
		{
		}
	}

	public class SubScene
	{
		public class SubSceneID : ExtEnum<SubSceneID>
		{
			public static readonly SubSceneID Slugcats = new SubSceneID("Slugcats", register: true);

			public static readonly SubSceneID Moon = new SubSceneID("Moon", register: true);

			public static readonly SubSceneID MoonBlessPlayer = new SubSceneID("MoonBlessPlayer", register: true);

			public static readonly SubSceneID MoonTalk = new SubSceneID("MoonTalk", register: true);

			public static readonly SubSceneID MoonPoint = new SubSceneID("MoonPoint", register: true);

			public static readonly SubSceneID MoonAndSlugcats = new SubSceneID("MoonAndSlugcats", register: true);

			public SubSceneID(string value, bool register = false)
				: base(value, register)
			{
			}
		}

		public class GateSceneActor : HologramPart
		{
			public class ActorID : ExtEnum<ActorID>
			{
				public static readonly ActorID Moon = new ActorID("Moon", register: true);

				public static readonly ActorID MoonPearl = new ActorID("MoonPearl", register: true);

				public static readonly ActorID MoonBless = new ActorID("MoonBless", register: true);

				public static readonly ActorID TheMark = new ActorID("TheMark", register: true);

				public static readonly ActorID MoonTalking = new ActorID("MoonTalking", register: true);

				public static readonly ActorID MoonTalkText1 = new ActorID("MoonTalkText1", register: true);

				public static readonly ActorID MoonPointing = new ActorID("MoonPointing", register: true);

				public static readonly ActorID MoonTalkText2 = new ActorID("MoonTalkText2", register: true);

				public static readonly ActorID MoonFinal = new ActorID("MoonFinal", register: true);

				public static readonly ActorID OtherSlugcat1 = new ActorID("OtherSlugcat1", register: true);

				public static readonly ActorID OtherSlugcat2 = new ActorID("OtherSlugcat2", register: true);

				public static readonly ActorID OtherSlugcat3 = new ActorID("OtherSlugcat3", register: true);

				public static readonly ActorID OtherSlugcat4 = new ActorID("OtherSlugcat4", register: true);

				public ActorID(string value, bool register = false)
					: base(value, register)
				{
				}
			}

			public class Layer
			{
				public string elementName;

				public string shader;

				public float alpha;

				public Layer(string elementName, string shader, float alpha)
				{
					this.elementName = elementName;
					this.shader = shader;
					this.alpha = alpha;
				}
			}

			public Vector2? idealPos;

			public ActorID ID;

			private float anchorY;

			public List<Layer> layers;

			public Color? myColor;

			protected override Color GetToColor
			{
				get
				{
					if (myColor.HasValue)
					{
						return myColor.Value;
					}
					return base.GetToColor;
				}
			}

			public GateSceneActor(OverseerHologram hologram, int firstSprite, ActorID ID)
				: base(hologram, firstSprite)
			{
				this.ID = ID;
				layers = new List<Layer>();
				float alpha = 0.3f;
				if (ID == ActorID.Moon)
				{
					layers.Add(new Layer("moon1A", "Hologram", 1f));
					layers.Add(new Layer("moon1B", "Basic", alpha));
				}
				else if (ID == ActorID.MoonBless)
				{
					layers.Add(new Layer("moon2A", "Hologram", 1f));
					layers.Add(new Layer("moon2B", "Basic", alpha));
				}
				else if (ID == ActorID.MoonTalking)
				{
					layers.Add(new Layer("moon3A", "Hologram", 1f));
					layers.Add(new Layer("moon3B", "Basic", alpha));
				}
				else if (ID == ActorID.MoonPointing)
				{
					layers.Add(new Layer("moon4A", "Hologram", 1f));
					layers.Add(new Layer("moon4B", "Basic", alpha));
				}
				else if (ID == ActorID.MoonFinal)
				{
					layers.Add(new Layer("moon5A", "Hologram", 1f));
					layers.Add(new Layer("moon5B", "Basic", alpha));
				}
				else if (ID == ActorID.OtherSlugcat1)
				{
					layers.Add(new Layer("otherSlugcat1A", "Hologram", 1f));
					layers.Add(new Layer("otherSlugcat1B", "Basic", alpha));
					idealPos = new Vector2(770f, 160f) + new Vector2(-40f, 0f);
				}
				else if (ID == ActorID.OtherSlugcat2)
				{
					layers.Add(new Layer("otherSlugcat2A", "Hologram", 1f));
					layers.Add(new Layer("otherSlugcat2B", "Basic", alpha));
					idealPos = new Vector2(770f, 160f) + new Vector2(-10f, 0f);
				}
				else if (ID == ActorID.OtherSlugcat3)
				{
					layers.Add(new Layer("otherSlugcat3A", "Hologram", 1f));
					layers.Add(new Layer("otherSlugcat3B", "Basic", alpha));
					idealPos = new Vector2(770f, 160f) + new Vector2(20f, 0f);
				}
				else if (ID == ActorID.OtherSlugcat4)
				{
					layers.Add(new Layer("otherSlugcat4A", "Hologram", 1f));
					layers.Add(new Layer("otherSlugcat4B", "Basic", alpha));
					idealPos = new Vector2(770f, 160f) + new Vector2(50f, 0f);
				}
				else if (ID == ActorID.TheMark)
				{
					layers.Add(new Layer("moonSceneMark", "Hologram", 1f));
				}
				else if (ID == ActorID.MoonPearl)
				{
					layers.Add(new Layer("moonBallA", "Hologram", 1f));
					layers.Add(new Layer("moonBallB", "Basic", alpha));
				}
				else if (ID == ActorID.MoonTalkText1)
				{
					layers.Add(new Layer("moonSceneTalk1", "Hologram", 1f));
				}
				else if (ID == ActorID.MoonTalkText2)
				{
					layers.Add(new Layer("moonSceneTalk2", "Hologram", 1f));
				}
				totalSprites = layers.Count;
			}

			public override void Update()
			{
				base.Update();
				if (idealPos.HasValue)
				{
					offset = idealPos.Value - hologram.pos;
				}
			}

			public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
			{
				base.InitiateSprites(sLeaser, rCam);
				for (int i = 0; i < layers.Count; i++)
				{
					sLeaser.sprites[firstSprite + i] = new FSprite(layers[i].elementName);
				}
			}

			public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos, Vector2 partPos, Vector2 headPos, float useFade, float popOut, Color useColor)
			{
				base.DrawSprites(sLeaser, rCam, timeStacker, camPos, partPos, headPos, useFade, popOut, useColor);
				for (int i = 0; i < layers.Count; i++)
				{
					if (Random.value > Mathf.InverseLerp(0.5f, 1f, useFade))
					{
						sLeaser.sprites[firstSprite + i].isVisible = false;
						continue;
					}
					sLeaser.sprites[firstSprite + i].isVisible = true;
					partPos = Vector3.Lerp(headPos, partPos, popOut);
					sLeaser.sprites[firstSprite + i].x = partPos.x - camPos.x;
					sLeaser.sprites[firstSprite + i].y = partPos.y - camPos.y;
					sLeaser.sprites[firstSprite + i].color = useColor;
					sLeaser.sprites[firstSprite + i].alpha = layers[i].alpha * useFade;
					if (Random.value > useFade)
					{
						sLeaser.sprites[firstSprite + i].shader = rCam.room.game.rainWorld.Shaders["Hologram"];
						sLeaser.sprites[firstSprite + i].element = Futile.atlasManager.GetElementWithName("pixel");
						sLeaser.sprites[firstSprite + i].anchorY = 0f;
						sLeaser.sprites[firstSprite + i].rotation = Custom.AimFromOneVectorToAnother(partPos, headPos);
						sLeaser.sprites[firstSprite + i].scaleY = Vector2.Distance(partPos, headPos);
						sLeaser.sprites[firstSprite + i].scaleX = 1f;
					}
					else
					{
						sLeaser.sprites[firstSprite + i].shader = rCam.room.game.rainWorld.Shaders[layers[i].shader];
						sLeaser.sprites[firstSprite + i].element = Futile.atlasManager.GetElementWithName(layers[i].elementName);
						sLeaser.sprites[firstSprite + i].rotation = 0f;
						sLeaser.sprites[firstSprite + i].scaleY = 1f;
						sLeaser.sprites[firstSprite + i].scaleX = Mathf.InverseLerp(0.5f, 1f, useFade);
						sLeaser.sprites[firstSprite + i].anchorY = anchorY;
					}
				}
			}
		}

		public class GateSceneMoon : GateSceneActor
		{
			public Vector2 haloOffset;

			public float ballsRotation;

			public GateSceneMoon(OverseerHologram hologram, int firstSprite, ActorID ID)
				: base(hologram, firstSprite, ID)
			{
			}

			public override void Update()
			{
				base.Update();
				ballsRotation += 2f;
				if (ID == ActorID.MoonPointing)
				{
					haloOffset = new Vector2(-5f, 40f);
				}
				else if (ID == ActorID.MoonBless)
				{
					haloOffset = new Vector2(4f, 40f);
				}
				else
				{
					haloOffset = new Vector2(0f, 40f);
				}
				if (ID == ActorID.Moon)
				{
					idealPos = new Vector2(726f, 192f);
				}
				else if (idealPos.HasValue)
				{
					idealPos = Custom.MoveTowards(idealPos.Value, hologram.communicateWith.mainBodyChunk.pos + new Vector2(50f, 60f), 4f);
				}
				else
				{
					idealPos = hologram.communicateWith.mainBodyChunk.pos;
				}
			}
		}

		public class MoonHalo : HologramPart
		{
			public GateSceneMoon myMoon;

			public MoonHalo(OverseerHologram hologram, int firstSprite, GateSceneMoon myMoon)
				: base(hologram, firstSprite)
			{
				this.myMoon = myMoon;
				totalSprites = 30;
			}

			public override void Update()
			{
				base.Update();
				visible = myMoon.visible;
			}

			public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
			{
				base.InitiateSprites(sLeaser, rCam);
				for (int i = 0; i < totalSprites; i++)
				{
					sLeaser.sprites[firstSprite + i] = new FSprite("pixel");
					sLeaser.sprites[firstSprite + i].anchorY = 0f;
					sLeaser.sprites[firstSprite + i].shader = rCam.room.game.rainWorld.Shaders["Hologram"];
				}
			}

			public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos, Vector2 partPos, Vector2 headPos, float useFade, float popOut, Color useColor)
			{
				for (int i = 0; i < totalSprites; i++)
				{
					if (Random.value > Mathf.InverseLerp(0.5f, 1f, useFade) || !myMoon.idealPos.HasValue)
					{
						sLeaser.sprites[firstSprite + i].isVisible = false;
						continue;
					}
					sLeaser.sprites[firstSprite + i].isVisible = true;
					sLeaser.sprites[firstSprite + i].alpha = 0.75f * useFade;
					Vector2 vector = Custom.RNV();
					Vector2 vector2 = myMoon.idealPos.Value + myMoon.haloOffset + vector * 20f;
					sLeaser.sprites[firstSprite + i].x = vector2.x - camPos.x;
					sLeaser.sprites[firstSprite + i].y = vector2.y - camPos.y;
					sLeaser.sprites[firstSprite + i].scaleY = Mathf.Lerp(30f, 60f, Mathf.Pow(Random.value, 2f));
					sLeaser.sprites[firstSprite + i].rotation = Custom.VecToDeg(vector);
					sLeaser.sprites[firstSprite + i].color = useColor;
				}
			}
		}

		public class GateSceneMoonBall : GateSceneActor
		{
			public GateSceneMoon myMoon;

			public int myIndex;

			public int totBalls;

			public GateSceneMoonBall(OverseerHologram hologram, int firstSprite, GateSceneMoon myMoon, int myIndex, int totBalls)
				: base(hologram, firstSprite, ActorID.MoonPearl)
			{
				this.myMoon = myMoon;
				this.myIndex = myIndex;
				this.totBalls = totBalls;
			}

			public override void Update()
			{
				base.Update();
				offset = myMoon.offset + myMoon.haloOffset + Custom.DegToVec((float)myIndex / (float)totBalls * 360f + myMoon.ballsRotation) * 40f;
			}
		}

		public class GateSceneMark : GateSceneActor
		{
			public GateSceneMark(OverseerHologram hologram, int firstSprite)
				: base(hologram, firstSprite, ActorID.TheMark)
			{
			}

			public override void Update()
			{
				base.Update();
				idealPos = hologram.communicateWith.mainBodyChunk.pos + new Vector2(0f, 40f);
			}
		}

		public class GateSceneMoonTalkText : GateSceneActor
		{
			public GateSceneMoon myMoon;

			public GateSceneMoonTalkText(OverseerHologram hologram, int firstSprite, ActorID ID, GateSceneMoon myMoon)
				: base(hologram, firstSprite, ID)
			{
				this.myMoon = myMoon;
			}

			public override void Update()
			{
				base.Update();
				if (Random.value < 1f / 30f)
				{
					offset = myMoon.offset + myMoon.haloOffset + new Vector2(-50f, -10f) + Custom.RNV() * (Random.value * 10f);
				}
			}
		}

		public GateScene gateScene;

		public SubSceneID sceneID;

		private bool v;

		public List<GateSceneActor> actors;

		public bool visible
		{
			get
			{
				return v;
			}
			set
			{
				v = value;
				for (int i = 0; i < actors.Count; i++)
				{
					actors[i].visible = v;
				}
			}
		}

		public SubScene(GateScene gateScene, SubSceneID sceneID)
		{
			this.gateScene = gateScene;
			this.sceneID = sceneID;
			actors = new List<GateSceneActor>();
			GateSceneMoon gateSceneMoon = null;
			if (sceneID == SubSceneID.Slugcats)
			{
				actors.Add(new GateSceneActor(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.OtherSlugcat1));
				gateScene.AddPart(actors[actors.Count - 1]);
				actors.Add(new GateSceneActor(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.OtherSlugcat2));
				gateScene.AddPart(actors[actors.Count - 1]);
				actors.Add(new GateSceneActor(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.OtherSlugcat3));
				gateScene.AddPart(actors[actors.Count - 1]);
				actors.Add(new GateSceneActor(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.OtherSlugcat4));
				gateScene.AddPart(actors[actors.Count - 1]);
			}
			else if (sceneID == SubSceneID.Moon)
			{
				gateSceneMoon = new GateSceneMoon(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.Moon);
				actors.Add(gateSceneMoon);
				gateScene.AddPart(gateSceneMoon);
				for (int i = 0; i < 7; i++)
				{
					actors.Add(new GateSceneMoonBall(gateScene, gateScene.totalSprites, gateSceneMoon, i, 7));
					gateScene.AddPart(actors[actors.Count - 1]);
				}
			}
			else if (sceneID == SubSceneID.MoonBlessPlayer)
			{
				gateSceneMoon = new GateSceneMoon(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.MoonBless);
				actors.Add(gateSceneMoon);
				gateScene.AddPart(gateSceneMoon);
				actors.Add(new GateSceneMark(gateScene, gateScene.totalSprites));
				gateScene.AddPart(actors[actors.Count - 1]);
			}
			else if (sceneID == SubSceneID.MoonTalk)
			{
				gateSceneMoon = new GateSceneMoon(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.MoonTalking);
				actors.Add(gateSceneMoon);
				gateScene.AddPart(gateSceneMoon);
				actors.Add(new GateSceneMoonTalkText(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.MoonTalkText1, gateSceneMoon));
				gateScene.AddPart(actors[actors.Count - 1]);
			}
			else if (sceneID == SubSceneID.MoonPoint)
			{
				gateSceneMoon = new GateSceneMoon(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.MoonPointing);
				actors.Add(gateSceneMoon);
				gateScene.AddPart(gateSceneMoon);
				actors.Add(new GateSceneMoonTalkText(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.MoonTalkText2, gateSceneMoon));
				gateScene.AddPart(actors[actors.Count - 1]);
			}
			else if (sceneID == SubSceneID.MoonAndSlugcats)
			{
				gateSceneMoon = new GateSceneMoon(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.MoonFinal);
				actors.Add(gateSceneMoon);
				gateScene.AddPart(gateSceneMoon);
				actors.Add(new GateSceneActor(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.OtherSlugcat1));
				gateScene.AddPart(actors[actors.Count - 1]);
				actors.Add(new GateSceneActor(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.OtherSlugcat2));
				gateScene.AddPart(actors[actors.Count - 1]);
				actors.Add(new GateSceneActor(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.OtherSlugcat3));
				gateScene.AddPart(actors[actors.Count - 1]);
				actors.Add(new GateSceneActor(gateScene, gateScene.totalSprites, GateSceneActor.ActorID.OtherSlugcat4));
				gateScene.AddPart(actors[actors.Count - 1]);
			}
			if (gateSceneMoon != null)
			{
				gateScene.AddPart(new MoonHalo(gateScene, gateScene.totalSprites, gateSceneMoon));
			}
		}
	}

	public List<SubScene> subScenes;

	public SceneID sceneId;

	public int counter;

	public int currSubScene;

	public int timeOnEachSubscene;

	public GateScene(Overseer overseer, Message message, Creature communicateWith, float importance)
		: base(overseer, message, communicateWith, importance)
	{
		subScenes = new List<SubScene>();
		sceneId = SceneID.MoonAndSlugcats;
		if (overseer.room.abstractRoom.name == "GATE_HI_GW")
		{
			sceneId = SceneID.MoonGiveMark;
		}
		else if (overseer.room.abstractRoom.name == "GATE_GW_SL" || overseer.room.abstractRoom.name == "GATE_SH_SL")
		{
			sceneId = SceneID.FullStory;
		}
		if (sceneId == SceneID.MoonAndSlugcats)
		{
			subScenes.Add(new SubScene(this, SubScene.SubSceneID.Moon));
			subScenes.Add(new SubScene(this, SubScene.SubSceneID.Slugcats));
			timeOnEachSubscene = 80;
		}
		else if (sceneId == SceneID.MoonGiveMark)
		{
			subScenes.Add(new SubScene(this, SubScene.SubSceneID.Moon));
			subScenes.Add(new SubScene(this, SubScene.SubSceneID.MoonBlessPlayer));
			timeOnEachSubscene = 160;
		}
		else if (sceneId == SceneID.FullStory)
		{
			subScenes.Add(new SubScene(this, SubScene.SubSceneID.Moon));
			subScenes.Add(new SubScene(this, SubScene.SubSceneID.MoonBlessPlayer));
			subScenes.Add(new SubScene(this, SubScene.SubSceneID.MoonTalk));
			subScenes.Add(new SubScene(this, SubScene.SubSceneID.MoonPoint));
			subScenes.Add(new SubScene(this, SubScene.SubSceneID.MoonAndSlugcats));
			timeOnEachSubscene = 160;
		}
		for (int i = 0; i < subScenes.Count; i++)
		{
			subScenes[i].visible = false;
		}
	}

	public override void Update(bool eu)
	{
		base.Update(eu);
		counter++;
		if (counter > timeOnEachSubscene)
		{
			counter = 0;
			currSubScene++;
			if (currSubScene >= subScenes.Count)
			{
				currSubScene = 0;
			}
			for (int i = 0; i < subScenes.Count; i++)
			{
				subScenes[i].visible = i == currSubScene;
			}
		}
	}

	public override float DisplayPosScore(IntVector2 testPos)
	{
		Vector2 b = new Vector2(726f, 192f);
		bool flag = false;
		int num = 0;
		while (!flag && num < subScenes.Count)
		{
			if (subScenes[num].visible)
			{
				int num2 = 0;
				while (!flag && num2 < subScenes[num].actors.Count)
				{
					if (subScenes[num].actors[num2].idealPos.HasValue)
					{
						b = subScenes[num].actors[num2].idealPos.Value;
						flag = true;
					}
					num2++;
				}
			}
			num++;
		}
		return Vector2.Distance(room.MiddleOfTile(testPos), b);
	}
}
