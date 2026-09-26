using System.Collections.Generic;
using UnityEngine;

public abstract class ComplexGraphicsModule : GraphicsModule
{
	public abstract class GraphicsSubModule
	{
		public ComplexGraphicsModule owner;

		public int firstSprite;

		public int totalSprites;

		public GraphicsSubModule(ComplexGraphicsModule owner, int firstSprite)
		{
			this.owner = owner;
			this.firstSprite = firstSprite;
		}

		public virtual void Update()
		{
		}

		public virtual void Reset()
		{
		}

		public virtual void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
		{
		}

		public virtual void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
		{
		}

		public virtual void ApplyPalette(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, RoomPalette palette)
		{
		}
	}

	public int totalSprites;

	public List<GraphicsSubModule> subModules;

	public ComplexGraphicsModule(PhysicalObject ow, bool internalContainers)
		: base(ow, internalContainers)
	{
		subModules = new List<GraphicsSubModule>();
	}

	public void AddSubModule(GraphicsSubModule newMod)
	{
		subModules.Add(newMod);
		totalSprites += newMod.totalSprites;
	}

	public override void Reset()
	{
		base.Reset();
		for (int i = 0; i < subModules.Count; i++)
		{
			subModules[i].Reset();
		}
	}

	public override void Update()
	{
		base.Update();
		if (!culled)
		{
			for (int i = 0; i < subModules.Count; i++)
			{
				subModules[i].Update();
			}
		}
	}

	public override void InitiateSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam)
	{
		base.InitiateSprites(sLeaser, rCam);
		for (int i = 0; i < subModules.Count; i++)
		{
			subModules[i].InitiateSprites(sLeaser, rCam);
		}
	}

	public override void DrawSprites(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, float timeStacker, Vector2 camPos)
	{
		base.DrawSprites(sLeaser, rCam, timeStacker, camPos);
		if (!culled)
		{
			for (int i = 0; i < subModules.Count; i++)
			{
				subModules[i].DrawSprites(sLeaser, rCam, timeStacker, camPos);
			}
		}
	}

	public override void ApplyPalette(RoomCamera.SpriteLeaser sLeaser, RoomCamera rCam, RoomPalette palette)
	{
		base.ApplyPalette(sLeaser, rCam, palette);
		for (int i = 0; i < subModules.Count; i++)
		{
			subModules[i].ApplyPalette(sLeaser, rCam, palette);
		}
	}
}
