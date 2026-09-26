using UnityEngine;

namespace Menu;

public abstract class PositionedMenuObject : MenuObject
{
	public Vector2 pos;

	public Vector2 lastPos;

	public Vector2 ScreenPos
	{
		get
		{
			if (owner == null || !(owner is PositionedMenuObject))
			{
				return pos;
			}
			return (owner as PositionedMenuObject).ScreenPos + pos;
		}
	}

	public Vector2 ScreenLastPos
	{
		get
		{
			if (owner == null || !(owner is PositionedMenuObject))
			{
				return lastPos;
			}
			return (owner as PositionedMenuObject).ScreenLastPos + lastPos;
		}
	}

	public PositionedMenuObject(Menu menu, MenuObject owner, Vector2 pos)
		: base(menu, owner)
	{
		this.pos = pos;
		lastPos = pos;
	}

	public override void Update()
	{
		base.Update();
		lastPos = pos;
	}

	public virtual Vector2 DrawPos(float timeStacker)
	{
		return Vector2.Lerp(ScreenLastPos, ScreenPos, timeStacker);
	}

	public virtual float DrawX(float timeStacker)
	{
		return Mathf.Lerp(ScreenLastPos.x, ScreenPos.x, timeStacker);
	}

	public virtual float DrawY(float timeStacker)
	{
		return Mathf.Lerp(ScreenLastPos.y, ScreenPos.y, timeStacker);
	}
}
