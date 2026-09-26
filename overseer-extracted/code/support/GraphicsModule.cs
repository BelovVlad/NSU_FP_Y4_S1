using System.Collections.Generic;
using RWCustom;
using UnityEngine;
using Watcher;

public abstract class GraphicsModule : IDrawable
{
	public class ObjectHeldInInternalContainer
	{
		public IDrawable obj;

		public int container;

		public ObjectHeldInInternalContainer(IDrawable obj, int container)
		{
			this.obj = obj;
			this.container = container;
		}
	}

	public List<ObjectHeldInInternalContainer> internalContainerObjects;

	public BodyPart[] bodyParts;

	public DebugLabel[] DEBUGLABELS;

	public MudOverlay mudOverlay;

	public bool culled;

	public bool lastCulled;

	public bool dispose;

	public float cullRange;

	private RippleHybridVFX rippleHybrid;

	private RippleHybridVFX.RippleSide rippleMaskSide;

	private float rippleActivationTime;

	public PhysicalObject owner { get; private set; }

	public virtual bool ShouldBeCulled
	{
		get
		{
			if (cullRange > 0f && owner.room != null && owner.room.cameraPositions.Length > 2 && !owner.room.game.cameras[0].PositionCurrentlyVisible(owner.firstChunk.pos, cullRange + (culled ? 0f : 100f), widescreen: true))
			{
				return !owner.room.game.cameras[0].PositionVisibleInNextScreen(owner.firstChunk.pos, culled ? 50f : 100f, widescreen: true);
			}
			return false;
		}
	}

	public RippleHybridVFX.HybridState rippleHybridState { get; private set; }

	private bool CanApplyMudOverlay
	{
		get
		{
			if (owner is Creature)
			{
				return this is IMuddableGraphics;
			}
			return false;
		}
	}

	public GraphicsModule(PhysicalObject ow, bool internalContainers)
	{
		owner = ow;
		cullRange = 200f;
		if (internalContainers)
		{
			internalContainerObjects = new List<ObjectHeldInInternalContainer>();
		}
		culled = true;
		lastCulled = true;
	}

	public virtual void Update()
	{
		lastCulled = culled;
		culled = ShouldBeCulled;
		if (!culled && lastCulled)
		{
			Reset();
		}
		if (mudOverlay != null)
		{
			if (mudOverlay.slatedForDeletetion)
			{
				mudOverlay = null;
			}
			else if (mudOverlay.room == null)
			{
				owner.room.AddObject(mudOverlay);
			}
		}
	}

	public virtual void SuckedIntoShortCut(Vector2 shortCutPosition)
	{
	}

	public virtual void Reset()
	{
		if (bodyParts != null)
		{
			for (int i = 0; i < bodyParts.Length; i++)
			{
				bodyParts[i].Reset(owner.firstChunk.pos);
			}
		}
	}

	public virtual void PushOutOf(Vector2 pos, float rad)
	{
		if (bodyParts == null)
		{
			return;
		}
		BodyPart[] array = bodyParts;
		foreach (BodyPart bodyPart in array)
		{
			if (Custom.DistLess(bodyPart.pos, pos, rad + bodyPart.rad))
			{
				float num = Vector2.Distance(bodyPart.pos, pos);
				Vector2 vector = Custom.DirVec(bodyPart.pos, pos);
				bodyPart.pos -= (rad + bodyPart.rad - num) * vector;
				bodyPart.vel -= (rad + bodyPart.rad - num) * vector;
			}
		}
	}

	public virtual void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
	{
		if (DEBUGLABELS != null && DEBUGLABELS.Length != 0)
		{
			DebugLabel[] dEBUGLABELS = DEBUGLABELS;
			foreach (DebugLabel debugLabel in dEBUGLABELS)
			{
				rCam.ReturnFContainer("HUD").AddChild(debugLabel.label);
			}
		}
	}

	public virtual void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
	{
		if (DEBUGLABELS != null && DEBUGLABELS.Length != 0)
		{
			DebugLabel[] dEBUGLABELS = DEBUGLABELS;
			foreach (DebugLabel debugLabel in dEBUGLABELS)
			{
				if (debugLabel.relativePos)
				{
					debugLabel.label.x = owner.bodyChunks[0].pos.x + debugLabel.pos.x - camPos.x;
					debugLabel.label.y = owner.bodyChunks[0].pos.y + debugLabel.pos.y - camPos.y;
				}
				else
				{
					debugLabel.label.x = debugLabel.pos.x;
					debugLabel.label.y = debugLabel.pos.y;
				}
			}
		}
		if (owner is Creature creature && creature.muddy > 0 && mudOverlay == null && CanApplyMudOverlay)
		{
			mudOverlay = new MudOverlay(creature, sLeaser);
		}
		UpdateRippleHybrid(sLeaser, owner.room);
		if (owner.slatedForDeletetion || owner.room != rCam.room || dispose)
		{
			sLeaser.CleanSpritesAndRemove();
			RemoveRippleHybrid();
		}
		if (sLeaser.sprites[0].isVisible == culled)
		{
			for (int j = 0; j < sLeaser.sprites.Length; j++)
			{
				sLeaser.sprites[j].isVisible = !culled;
			}
		}
	}

	public virtual void ApplyPalette(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, RoomPalette palette)
	{
	}

	public virtual void AddToContainer(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, FContainer newContatiner)
	{
		sLeaser.RemoveAllSpritesFromContainer();
		if (newContatiner == null)
		{
			newContatiner = rCam.ReturnFContainer("Midground");
		}
		FSprite[] sprites = sLeaser.sprites;
		foreach (FSprite node in sprites)
		{
			newContatiner.AddChild(node);
		}
		if (sLeaser.containers != null)
		{
			FContainer[] containers = sLeaser.containers;
			foreach (FContainer node2 in containers)
			{
				newContatiner.AddChild(node2);
			}
		}
	}

	public void AddObjectToInternalContainer(IDrawable obj, int container)
	{
		ObjectHeldInInternalContainer item = new ObjectHeldInInternalContainer(obj, container);
		for (int i = 0; i < owner.abstractPhysicalObject.world.game.cameras.Length; i++)
		{
			owner.abstractPhysicalObject.world.game.cameras[i].MoveObjectToInternalContainer(obj, this, container);
		}
		internalContainerObjects.Add(item);
	}

	public void ReleaseAllInternallyContainedSprites()
	{
		for (int num = internalContainerObjects.Count - 1; num >= 0; num--)
		{
			for (int i = 0; i < owner.abstractPhysicalObject.world.game.cameras.Length; i++)
			{
				owner.abstractPhysicalObject.world.game.cameras[i].MoveObjectToContainer(internalContainerObjects[num].obj, null);
			}
			internalContainerObjects.RemoveAt(num);
		}
	}

	public void ReleaseSpecificInternallyContainedObjectSprites(PhysicalObject obj)
	{
		if (internalContainerObjects != null)
		{
			if (obj is IDrawable)
			{
				ReleaseSpecificInternallyContainedObjectSprites(obj as IDrawable);
			}
			else if (obj.graphicsModule != null)
			{
				ReleaseSpecificInternallyContainedObjectSprites(obj.graphicsModule);
			}
		}
	}

	public void ReleaseSpecificInternallyContainedObjectSprites(IDrawable obj)
	{
		if (internalContainerObjects == null)
		{
			return;
		}
		for (int i = 0; i < internalContainerObjects.Count; i++)
		{
			if (internalContainerObjects[i].obj == obj)
			{
				ReleaseSpecificInternallyContainedObjectSprites(i);
			}
		}
	}

	public void ReleaseSpecificInternallyContainedObjectSprites(int index)
	{
		if (internalContainerObjects != null)
		{
			for (int i = 0; i < owner.abstractPhysicalObject.world.game.cameras.Length; i++)
			{
				owner.abstractPhysicalObject.world.game.cameras[i].MoveObjectToContainer(internalContainerObjects[index].obj, null);
			}
			internalContainerObjects.RemoveAt(index);
		}
	}

	public void BringSpritesToFront()
	{
		for (int i = 0; i < owner.abstractPhysicalObject.world.game.cameras.Length; i++)
		{
			owner.abstractPhysicalObject.world.game.cameras[i].MoveObjectToContainer(this, null);
		}
	}

	public Color HypothermiaColorBlend(Color oldCol)
	{
		Color b = new Color(0f, 0f, 0f, 0f);
		if (owner is Creature)
		{
			float hypothermia = (owner.abstractPhysicalObject as AbstractCreature).Hypothermia;
			b = ((!(hypothermia < 1f)) ? Color.Lerp(new Color(0.8f, 0.8f, 1f), new Color(0.3f, 0.15f, 0.2f), hypothermia - 1f) : Color.Lerp(oldCol, new Color(0.8f, 0.8f, 1f), hypothermia));
		}
		return Color.Lerp(oldCol, b, 0.92f);
	}

	public void ActivateRippleHybrid(float activationTime, RippleHybridVFX.RippleSide rippleMaskSide)
	{
		if (rippleHybridState == RippleHybridVFX.HybridState.Off && rippleHybrid == null)
		{
			rippleHybridState = RippleHybridVFX.HybridState.Activate;
			this.rippleMaskSide = rippleMaskSide;
			rippleActivationTime = activationTime;
		}
	}

	public void DeactivateRippleHybrid()
	{
		if (rippleHybrid != null)
		{
			rippleHybridState = RippleHybridVFX.HybridState.Deactivate;
		}
	}

	private void UpdateRippleHybrid(RoomCamera.SpriteLeaser sLeaser, Room room)
	{
		if (rippleHybridState != 0)
		{
			if (rippleHybrid == null)
			{
				rippleHybrid = new RippleHybridVFX(sLeaser, owner.room, rippleActivationTime, rippleMaskSide);
			}
			if (rippleHybridState == RippleHybridVFX.HybridState.Deactivate)
			{
				rippleHybrid.deactivate = true;
			}
			rippleHybrid.Update(sLeaser);
			if (rippleHybrid.deleteMe)
			{
				rippleHybrid = null;
				rippleHybridState = RippleHybridVFX.HybridState.Off;
			}
		}
	}

	private void RemoveRippleHybrid()
	{
		rippleHybridState = RippleHybridVFX.HybridState.Off;
		if (rippleHybrid != null)
		{
			rippleHybrid.delete();
			rippleHybrid = null;
		}
	}
}
