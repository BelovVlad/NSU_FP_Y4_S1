using System.Collections.Generic;

namespace Menu;

public abstract class MenuObject
{
	public Menu menu;

	public List<MenuObject> subObjects;

	public MenuObject owner;

	public MenuObject[] nextSelectable;

	public bool toggled;

	public bool inactive;

	protected FContainer myContainer;

	public virtual FContainer Container
	{
		get
		{
			if (myContainer != null)
			{
				return myContainer;
			}
			if (owner != null)
			{
				return owner.Container;
			}
			return menu.container;
		}
		set
		{
			myContainer = value;
		}
	}

	public virtual bool Selected
	{
		get
		{
			if (menu.selectedObject == this)
			{
				if (menu.manager.dialog != null)
				{
					return menu.manager.dialog == menu;
				}
				return true;
			}
			return false;
		}
	}

	public Page page
	{
		get
		{
			if (this is Page)
			{
				return this as Page;
			}
			if (owner is Page)
			{
				return owner as Page;
			}
			return owner.page;
		}
	}

	public MenuObject(Menu menu, MenuObject owner)
	{
		this.menu = menu;
		this.owner = owner;
		subObjects = new List<MenuObject>();
		nextSelectable = new MenuObject[4];
	}

	public virtual void Update()
	{
		for (int i = 0; i < subObjects.Count; i++)
		{
			subObjects[i].Update();
		}
	}

	public virtual void GrafUpdate(float timeStacker)
	{
		for (int i = 0; i < subObjects.Count; i++)
		{
			subObjects[i].GrafUpdate(timeStacker);
		}
	}

	public virtual void Singal(MenuObject sender, string message)
	{
		if (owner != null)
		{
			owner.Singal(sender, message);
		}
		else
		{
			menu.Singal(sender, message);
		}
	}

	public virtual void RemoveSprites()
	{
		if (myContainer != null)
		{
			myContainer.RemoveAllChildren();
			myContainer.RemoveFromContainer();
		}
		for (int i = 0; i < subObjects.Count; i++)
		{
			subObjects[i].RemoveSprites();
		}
	}

	public void RemoveSubObject(MenuObject obj)
	{
		RecursiveRemoveSelectables(obj);
		for (int num = subObjects.Count - 1; num >= 0; num--)
		{
			if (subObjects[num] == obj)
			{
				subObjects.RemoveAt(num);
				break;
			}
		}
	}

	private void RecursiveRemoveSelectables(MenuObject obj)
	{
		if (obj is SelectableMenuObject)
		{
			for (int num = page.selectables.Count - 1; num >= 0; num--)
			{
				if (page.selectables[num] == obj)
				{
					page.selectables.RemoveAt(num);
					break;
				}
			}
			if (page.lastSelectedObject == obj && page.selectables.Count > 0)
			{
				page.lastSelectedObject = page.selectables[0] as MenuObject;
			}
		}
		for (int i = 0; i < obj.subObjects.Count; i++)
		{
			obj.RecursiveRemoveSelectables(obj.subObjects[i]);
		}
	}
}
